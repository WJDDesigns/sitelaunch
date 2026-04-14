-- ============================================================================
-- SiteLaunch — initial schema
-- Migration 0001
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Enums ---------------------------------------------------------------------
do $$ begin
  create type app_role as enum ('superadmin', 'partner_owner', 'partner_member', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('draft', 'submitted', 'in_review', 'complete', 'archived');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- profiles: 1:1 with auth.users
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text,
  avatar_url text,
  role app_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- partners: the tenant table
-- ============================================================================
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,                -- pop, acme, …  → pop.mysitelaunch.com
  name text not null,                         -- display name
  custom_domain citext unique,                -- e.g. onboard.popmarketing.com
  logo_url text,
  primary_color text default '#2563eb',
  accent_color  text default '#f97316',
  support_email citext,
  support_phone text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partners_custom_domain_idx on public.partners (custom_domain);

-- ============================================================================
-- partner_members: who can manage a partner
-- ============================================================================
create table if not exists public.partner_members (
  partner_id uuid not null references public.partners(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role app_role not null default 'partner_member',
  created_at timestamptz not null default now(),
  primary key (partner_id, user_id)
);

create index if not exists partner_members_user_idx on public.partner_members(user_id);

-- ============================================================================
-- form_templates: platform-level form definitions (JSON schema)
-- ============================================================================
create table if not exists public.form_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  version int not null default 1,
  schema jsonb not null,                      -- JSON schema describing pages/fields
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- partner_forms: a partner's customized version of a template
-- ============================================================================
create table if not exists public.partner_forms (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  template_id uuid not null references public.form_templates(id) on delete restrict,
  overrides jsonb not null default '{}'::jsonb,   -- per-partner toggles / labels / pricing
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_forms_partner_idx on public.partner_forms(partner_id);

-- ============================================================================
-- submissions: a client's onboarding response
-- ============================================================================
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  partner_form_id uuid not null references public.partner_forms(id) on delete restrict,
  client_user_id uuid references public.profiles(id) on delete set null,
  client_email citext,
  client_name  text,
  status submission_status not null default 'draft',
  data jsonb not null default '{}'::jsonb,        -- the actual answers
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submissions_partner_idx on public.submissions(partner_id);
create index if not exists submissions_status_idx  on public.submissions(status);

-- ============================================================================
-- submission_files: uploaded assets (metadata; files live in Storage)
-- ============================================================================
create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  field_key text not null,                    -- which field this file belongs to
  storage_path text not null,                 -- path within the Storage bucket
  filename text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists submission_files_submission_idx on public.submission_files(submission_id);

-- ============================================================================
-- invites: partner/user invitations
-- ============================================================================
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  partner_id uuid references public.partners(id) on delete cascade,
  role app_role not null default 'partner_owner',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index if not exists invites_email_idx on public.invites(email);

-- ============================================================================
-- events: lightweight audit log
-- ============================================================================
create table if not exists public.events (
  id bigserial primary key,
  partner_id uuid references public.partners(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_partner_created_idx on public.events(partner_id, created_at desc);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ declare t text; begin
  for t in select unnest(array['profiles','partners','partner_forms','submissions']) loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.tg_set_updated_at()', t);
  end loop;
end $$;

-- ============================================================================
-- Auto-create profile on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Helper: is the current user a member of this partner?
-- ============================================================================
create or replace function public.is_partner_member(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partner_members
    where partner_id = p_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles         enable row level security;
alter table public.partners         enable row level security;
alter table public.partner_members  enable row level security;
alter table public.form_templates   enable row level security;
alter table public.partner_forms    enable row level security;
alter table public.submissions      enable row level security;
alter table public.submission_files enable row level security;
alter table public.invites          enable row level security;
alter table public.events           enable row level security;

-- profiles: you can read/update yourself; superadmin can read all
drop policy if exists profiles_self_read    on public.profiles;
drop policy if exists profiles_self_update  on public.profiles;
drop policy if exists profiles_admin_read   on public.profiles;
create policy profiles_self_read   on public.profiles for select using (id = auth.uid() or public.is_superadmin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid());

-- partners: members can read their partner; superadmin reads all; superadmin writes
drop policy if exists partners_member_read on public.partners;
drop policy if exists partners_admin_all   on public.partners;
create policy partners_member_read on public.partners for select
  using (public.is_partner_member(id) or public.is_superadmin());
create policy partners_admin_all on public.partners for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- partner_members: members see their own rows; superadmin all
drop policy if exists partner_members_read on public.partner_members;
create policy partner_members_read on public.partner_members for select
  using (user_id = auth.uid() or public.is_partner_member(partner_id) or public.is_superadmin());

-- form_templates: readable by all authenticated; only superadmin writes
drop policy if exists form_templates_read on public.form_templates;
drop policy if exists form_templates_write on public.form_templates;
create policy form_templates_read on public.form_templates for select using (auth.role() = 'authenticated');
create policy form_templates_write on public.form_templates for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- partner_forms: members read/write theirs; superadmin all
drop policy if exists partner_forms_member_rw on public.partner_forms;
create policy partner_forms_member_rw on public.partner_forms for all
  using (public.is_partner_member(partner_id) or public.is_superadmin())
  with check (public.is_partner_member(partner_id) or public.is_superadmin());

-- submissions: partner members read/write their submissions; clients read their own
drop policy if exists submissions_partner_rw on public.submissions;
drop policy if exists submissions_client_own on public.submissions;
create policy submissions_partner_rw on public.submissions for all
  using (public.is_partner_member(partner_id) or public.is_superadmin())
  with check (public.is_partner_member(partner_id) or public.is_superadmin());
create policy submissions_client_own on public.submissions for select
  using (client_user_id = auth.uid());

-- submission_files: follow parent submission
drop policy if exists submission_files_rw on public.submission_files;
create policy submission_files_rw on public.submission_files for all
  using (exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (public.is_partner_member(s.partner_id) or public.is_superadmin() or s.client_user_id = auth.uid())
  ))
  with check (exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (public.is_partner_member(s.partner_id) or public.is_superadmin() or s.client_user_id = auth.uid())
  ));

-- invites: only superadmin or the invited email (not enforceable by auth.uid so superadmin only for now)
drop policy if exists invites_admin on public.invites;
create policy invites_admin on public.invites for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- events: partner members read theirs; superadmin all
drop policy if exists events_read on public.events;
create policy events_read on public.events for select
  using (public.is_partner_member(partner_id) or public.is_superadmin());
