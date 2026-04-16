-- Cloud storage integrations (Google Drive, Dropbox, OneDrive, Box)

create table if not exists public.cloud_integrations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  provider text not null check (provider in ('google_drive', 'dropbox', 'onedrive', 'box')),
  account_email text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz,
  scopes text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, provider)
);

create index cloud_integrations_partner_idx on public.cloud_integrations(partner_id);

alter table public.cloud_integrations enable row level security;

create policy cloud_integrations_select on public.cloud_integrations for select
  using (public.is_partner_member(partner_id) or public.is_superadmin());

create policy cloud_integrations_insert on public.cloud_integrations for insert
  with check (public.is_partner_member(partner_id) or public.is_superadmin());

create policy cloud_integrations_update on public.cloud_integrations for update
  using (public.is_partner_member(partner_id) or public.is_superadmin());

create policy cloud_integrations_delete on public.cloud_integrations for delete
  using (public.is_partner_member(partner_id) or public.is_superadmin());

create trigger set_updated_at before update on public.cloud_integrations
  for each row execute function public.tg_set_updated_at();

-- Sync log: tracks file uploads to cloud per submission per field
create table if not exists public.cloud_sync_log (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  integration_id uuid not null references public.cloud_integrations(id) on delete cascade,
  field_key text not null,
  cloud_folder_url text,
  status text not null default 'pending' check (status in ('pending', 'syncing', 'synced', 'failed')),
  error_message text,
  file_count int not null default 0,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index cloud_sync_log_submission_idx on public.cloud_sync_log(submission_id);

alter table public.cloud_sync_log enable row level security;

create policy cloud_sync_log_select on public.cloud_sync_log for select
  using (exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (public.is_partner_member(s.partner_id) or public.is_superadmin())
  ));

create policy cloud_sync_log_insert on public.cloud_sync_log for insert
  with check (exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (public.is_partner_member(s.partner_id) or public.is_superadmin())
  ));

create policy cloud_sync_log_update on public.cloud_sync_log for update
  using (exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (public.is_partner_member(s.partner_id) or public.is_superadmin())
  ));
