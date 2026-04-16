-- Passkey / WebAuthn credential storage
-- Supabase handles TOTP MFA natively via auth.mfa_factors,
-- but passkeys need a custom table for credential storage.

create table if not exists public.user_passkeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,   -- base64url-encoded credential ID
  public_key    text not null,           -- base64url-encoded public key
  counter       bigint not null default 0,
  device_name   text,                    -- friendly name (e.g. "MacBook Pro Touch ID")
  transports    text[],                  -- e.g. {"internal","hybrid"}
  created_at    timestamptz not null default now()
);

-- Index for fast lookups during authentication
create index if not exists idx_user_passkeys_user_id on public.user_passkeys(user_id);
create index if not exists idx_user_passkeys_credential_id on public.user_passkeys(credential_id);

-- Track whether user has completed MFA enrollment
-- (profiles.mfa_enabled tracks overall state)
alter table public.profiles
  add column if not exists mfa_enabled boolean not null default false;

-- RLS: users can only manage their own passkeys
alter table public.user_passkeys enable row level security;

create policy "Users can view own passkeys"
  on public.user_passkeys for select
  using (auth.uid() = user_id);

create policy "Users can insert own passkeys"
  on public.user_passkeys for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own passkeys"
  on public.user_passkeys for delete
  using (auth.uid() = user_id);

create policy "Users can update own passkeys"
  on public.user_passkeys for update
  using (auth.uid() = user_id);
