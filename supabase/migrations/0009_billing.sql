-- ============================================================================
-- SiteLaunch — Stripe billing integration
-- Migration 0009
-- ============================================================================

-- Store Stripe customer ID on partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

CREATE INDEX IF NOT EXISTS partners_stripe_customer_idx
  ON public.partners(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- Subscriptions table — mirrors Stripe subscription state
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id               text PRIMARY KEY,          -- Stripe subscription ID (sub_xxx)
  partner_id       uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_price_id  text NOT NULL,
  plan_tier        text NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'enterprise'
  status           text NOT NULL DEFAULT 'active', -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at      timestamptz,
  trial_end        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_partner_idx ON public.subscriptions(partner_id);
CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);

-- RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Superadmins see all; partners see their own
CREATE POLICY subscriptions_read ON public.subscriptions FOR SELECT
  USING (
    public.is_superadmin()
    OR public.is_account_member(partner_id)
  );

-- Only service role (webhooks) can write subscriptions
CREATE POLICY subscriptions_service_write ON public.subscriptions FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ============================================================================
-- Billing events log — tracks plan changes, payments, refunds
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.billing_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  event_type   text NOT NULL,  -- 'subscription_created' | 'subscription_updated' | 'plan_changed' | 'payment_succeeded' | 'payment_failed' | 'refund_issued' | 'manual_change'
  description  text,
  stripe_event_id text,        -- Stripe event ID for dedup
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid           -- null for webhook events, user id for manual changes
);

CREATE INDEX IF NOT EXISTS billing_events_partner_idx ON public.billing_events(partner_id);
CREATE INDEX IF NOT EXISTS billing_events_stripe_idx ON public.billing_events(stripe_event_id) WHERE stripe_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_events_type_idx ON public.billing_events(event_type);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_events_read ON public.billing_events FOR SELECT
  USING (
    public.is_superadmin()
    OR public.is_account_member(partner_id)
  );

CREATE POLICY billing_events_service_write ON public.billing_events FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ============================================================================
-- Invoices cache — populated from Stripe webhooks for fast dashboard display
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id               text PRIMARY KEY,          -- Stripe invoice ID (in_xxx)
  partner_id       uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  subscription_id  text REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  status           text NOT NULL,             -- 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  amount_due       int NOT NULL DEFAULT 0,    -- cents
  amount_paid      int NOT NULL DEFAULT 0,    -- cents
  currency         text NOT NULL DEFAULT 'usd',
  invoice_url      text,                      -- Stripe hosted invoice URL
  invoice_pdf      text,                      -- PDF download link
  period_start     timestamptz,
  period_end       timestamptz,
  due_date         timestamptz,
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_partner_idx ON public.invoices(partner_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_read ON public.invoices FOR SELECT
  USING (
    public.is_superadmin()
    OR public.is_account_member(partner_id)
  );

CREATE POLICY invoices_service_write ON public.invoices FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ============================================================================
-- Helper: update updated_at on subscriptions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
