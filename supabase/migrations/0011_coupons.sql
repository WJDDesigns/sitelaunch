-- ============================================================
-- 0011 — Coupons table
-- ============================================================

create type coupon_type as enum ('percentage', 'fixed');

create table coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  description     text,
  type            coupon_type not null default 'percentage',
  value           integer not null,              -- percentage (0-100) or cents
  min_plan_price  integer not null default 0,    -- minimum plan price in cents to apply
  expires_at      timestamptz,
  max_redemptions integer,                       -- null = unlimited
  times_redeemed  integer not null default 0,
  is_active       boolean not null default true,
  stripe_coupon_id text,                         -- synced Stripe coupon ID
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Fast lookup by code
create unique index coupons_code_idx on coupons (lower(code));

-- Track which partners redeemed which coupons
create table coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references coupons(id) on delete cascade,
  partner_id  uuid not null references partners(id) on delete cascade,
  plan_slug   text not null,
  discount    integer not null,                  -- actual discount in cents
  created_at  timestamptz not null default now()
);

create index coupon_redemptions_coupon_idx on coupon_redemptions (coupon_id);
create index coupon_redemptions_partner_idx on coupon_redemptions (partner_id);

-- RLS
alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;

-- Only service role can read/write coupons (admin-only)
create policy "Service role full access on coupons"
  on coupons for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access on coupon_redemptions"
  on coupon_redemptions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
