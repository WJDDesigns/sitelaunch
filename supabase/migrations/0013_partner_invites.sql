-- Partner invite system: permissions flags + form change requests
-- ================================================================

-- 1. Add permission flags to partners table
alter table public.partners
  add column if not exists allow_partner_form_editing boolean not null default false;

-- 2. Form change requests (partner proposes, owner approves)
create table if not exists public.form_change_requests (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.partners(id) on delete cascade,
  partner_form_id uuid not null references public.partner_forms(id) on delete cascade,
  requested_by  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  proposed_overrides jsonb not null default '{}'::jsonb,
  review_note   text,
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists form_change_requests_partner_idx
  on public.form_change_requests(partner_id);
create index if not exists form_change_requests_status_idx
  on public.form_change_requests(status) where status = 'pending';

-- 3. RLS for form_change_requests
alter table public.form_change_requests enable row level security;

-- Partner members can view their own partner's requests
create policy "partner_read" on public.form_change_requests
  for select using (
    is_partner_member(partner_id) or is_superadmin()
  );

-- Partner members can insert requests for their own partner
create policy "partner_insert" on public.form_change_requests
  for insert with check (
    is_partner_member(partner_id)
  );

-- Only account owner or superadmin can update (approve/reject)
create policy "owner_update" on public.form_change_requests
  for update using (
    is_account_member(partner_id) or is_superadmin()
  );

-- 4. Update invites RLS to allow partner owners to manage invites for their partners
-- Drop the old restrictive policies
drop policy if exists "admin_read" on public.invites;
drop policy if exists "admin_write" on public.invites;

-- New policies: superadmin can do anything; partner owners can manage invites for their partner
create policy "invite_read" on public.invites
  for select using (
    is_superadmin()
    or (partner_id is not null and is_account_member(partner_id))
    or (partner_id is null and is_superadmin())
  );

create policy "invite_insert" on public.invites
  for insert with check (
    is_superadmin()
    or (partner_id is not null and is_account_member(partner_id))
  );

create policy "invite_update" on public.invites
  for update using (
    is_superadmin()
    or (partner_id is not null and is_account_member(partner_id))
  );

create policy "invite_delete" on public.invites
  for delete using (
    is_superadmin()
    or (partner_id is not null and is_account_member(partner_id))
  );
