-- Integration requests: partners can request integrations they want added
create table public.integration_requests (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  integration_name text not null,
  description text,
  created_at timestamptz not null default now(),
  -- One vote per partner per integration name
  unique (partner_id, integration_name)
);

alter table public.integration_requests enable row level security;

create policy "Partners manage own requests" on public.integration_requests
  for all using (partner_id in (
    select pm.partner_id from public.partner_members pm
    where pm.user_id = auth.uid()
  ));

-- Index for admin leaderboard aggregation
create index idx_integration_requests_name on public.integration_requests (integration_name);
