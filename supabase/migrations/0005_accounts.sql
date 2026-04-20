-- ============================================================================
-- linqme — self-serve account model
-- Migration 0005
-- ============================================================================

-- Plan enums -----------------------------------------------------------------
do $$ begin
  create type plan_type as enum ('agency', 'agency_plus_partners');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_tier as enum ('free', 'paid', 'unlimited', 'enterprise');
exception when duplicate_object then null; end $$;

-- Add account columns to partners -------------------------------------------
alter table public.partners
  add column if not exists parent_partner_id uuid references public.partners(id) on delete cascade,
  add column if not exists plan_type plan_type,
  add column if not exists plan_tier plan_tier,
  add column if not exists submissions_monthly_limit int;

create index if not exists partners_parent_idx on public.partners(parent_partner_id);

-- Backfill: any existing partner without a parent is a top-level account.
-- Default existing tenants (pre-SaaS) to agency_plus_partners + unlimited so
-- WJD's current setup keeps working exactly as it did.
update public.partners
set plan_type = coalesce(plan_type, 'agency_plus_partners'),
    plan_tier = coalesce(plan_tier, 'unlimited')
where parent_partner_id is null;

-- ============================================================================
-- Helper: find the top-level account for any partner (follows parent chain)
-- ============================================================================
create or replace function public.account_root(p_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  with recursive chain as (
    select id, parent_partner_id from public.partners where id = p_id
    union all
    select p.id, p.parent_partner_id
      from public.partners p
      join chain c on p.id = c.parent_partner_id
  )
  select id from chain where parent_partner_id is null limit 1;
$$;

-- ============================================================================
-- Helper: is the current user a member of the account tree rooted at a partner?
-- Membership on the root propagates down to all sub-partners in the tree.
-- ============================================================================
create or replace function public.is_account_member(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.partner_members pm
    where pm.user_id = auth.uid()
      and pm.partner_id = public.account_root(p_id)
  );
$$;

-- ============================================================================
-- Expand partners RLS so sub-partners are visible to account owners
-- ============================================================================
drop policy if exists partners_member_read on public.partners;
drop policy if exists partners_account_read on public.partners;
create policy partners_account_read on public.partners for select
  using (
    public.is_superadmin()
    or public.is_partner_member(id)
    or public.is_account_member(id)
  );

-- Account owners can also insert sub-partners under their top-level account.
drop policy if exists partners_account_insert on public.partners;
create policy partners_account_insert on public.partners for insert
  with check (
    public.is_superadmin()
    or (
      parent_partner_id is not null
      and public.is_account_member(parent_partner_id)
    )
  );

-- Account owners can update their own account tree; superadmin updates anything.
drop policy if exists partners_account_update on public.partners;
create policy partners_account_update on public.partners for update
  using (public.is_superadmin() or public.is_account_member(id))
  with check (public.is_superadmin() or public.is_account_member(id));

-- Deletes still superadmin-only (from partners_admin_all above — keep that).

-- ============================================================================
-- Submissions: extend visibility to account members of ancestor partner
-- ============================================================================
drop policy if exists submissions_partner_rw on public.submissions;
create policy submissions_partner_rw on public.submissions for all
  using (
    public.is_superadmin()
    or public.is_partner_member(partner_id)
    or public.is_account_member(partner_id)
  )
  with check (
    public.is_superadmin()
    or public.is_partner_member(partner_id)
    or public.is_account_member(partner_id)
  );

-- ============================================================================
-- Submissions-this-month view (for usage meter)
-- ============================================================================
create or replace view public.submissions_usage as
select
  public.account_root(partner_id) as account_id,
  date_trunc('month', coalesce(submitted_at, created_at)) as month,
  count(*)::int as count
from public.submissions
where status <> 'draft'
group by 1, 2;

grant select on public.submissions_usage to authenticated;

-- ============================================================================
-- Signup convenience: bootstrap a top-level partner for a new user.
-- Used by the /signup server action (via service role so it works for the
-- just-created user before any session exists in RLS context).
-- ============================================================================
create or replace function public.bootstrap_account(
  p_owner_id uuid,
  p_company_name text,
  p_slug citext,
  p_plan_type plan_type
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_partner_id uuid;
  v_tier plan_tier := 'free';
begin
  insert into public.partners (slug, name, plan_type, plan_tier, submissions_monthly_limit, created_by)
  values (p_slug, p_company_name, p_plan_type, v_tier,
          case when v_tier = 'free' then 1 else null end,
          p_owner_id)
  returning id into v_partner_id;

  insert into public.partner_members (partner_id, user_id, role)
  values (v_partner_id, p_owner_id, 'partner_owner')
  on conflict do nothing;

  -- Promote profile role so dashboard UI treats them correctly.
  update public.profiles set role = 'partner_owner' where id = p_owner_id;

  return v_partner_id;
end $$;
