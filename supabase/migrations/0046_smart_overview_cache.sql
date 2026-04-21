create table if not exists public.smart_overview_cache (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  partner_form_id uuid not null references public.partner_forms(id) on delete cascade,
  overview_html text not null,
  entry_count integer not null default 0,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(partner_id, partner_form_id)
);

alter table public.smart_overview_cache enable row level security;

create policy "Partners manage own overviews" on public.smart_overview_cache
  for all using (partner_id in (select pm.partner_id from public.partner_members pm where pm.user_id = auth.uid()));
