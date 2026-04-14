-- ============================================================================
-- SiteLaunch — Editable plans table
-- Migration 0010
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,          -- 'free', 'pro', 'enterprise', or custom
  name             text NOT NULL,                 -- Display name e.g. "Starlink"
  price_monthly    int NOT NULL DEFAULT 0,        -- Cents (0 = free)
  submissions_monthly_limit int,                  -- NULL = unlimited
  features         jsonb NOT NULL DEFAULT '[]',   -- Array of feature strings
  stripe_product_id text,                         -- Stripe product ID
  stripe_price_id  text,                          -- Stripe monthly price ID
  is_active        boolean NOT NULL DEFAULT true,  -- Soft-delete / hide from new signups
  highlight        boolean NOT NULL DEFAULT false,  -- "Most Popular" badge
  sort_order       int NOT NULL DEFAULT 0,         -- Display order
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Seed default plans from existing hardcoded values
INSERT INTO public.plans (slug, name, price_monthly, submissions_monthly_limit, features, is_active, highlight, sort_order)
VALUES
  ('free', 'Starlink', 0, 1,
   '["Your own branded workspace", "Unlimited form fields", "File uploads", "1 submission / month"]'::jsonb,
   true, false, 0),
  ('pro', 'Supernova', 14900, NULL,
   '["Everything in Starlink", "Unlimited submissions", "Custom domain", "Branded emails", "Full white-labeling"]'::jsonb,
   true, true, 1),
  ('enterprise', 'Galactic', 39900, NULL,
   '["Everything in Supernova", "Priority support", "API access (coming)", "Dedicated success contact"]'::jsonb,
   true, false, 2)
ON CONFLICT (slug) DO NOTHING;

-- RLS — everyone can read plans, only superadmins can write
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_read ON public.plans FOR SELECT
  USING (true);

CREATE POLICY plans_admin_write ON public.plans FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Auto-update updated_at
DROP TRIGGER IF EXISTS plans_updated_at ON public.plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
