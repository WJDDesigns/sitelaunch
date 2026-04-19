-- Geocoding / address autocomplete integrations (Google Places, OpenStreetMap)
create table if not exists public.geocoding_integrations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  provider text not null check (provider in ('google', 'openstreetmap')),
  api_key_encrypted text, -- nullable: OpenStreetMap does not require an API key
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, provider)
);

alter table public.geocoding_integrations enable row level security;

create policy "Partners can view own geocoding integrations"
  on public.geocoding_integrations for select
  using (partner_id in (
    select id from public.partners where created_by = auth.uid()
    union
    select partner_id from public.partner_members where user_id = auth.uid()
  ));
