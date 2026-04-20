-- linqme — Extended signup profile fields
-- Adds columns to partners and profiles for richer onboarding data.

-- ── Partner-level business details ──────────────────────────────────────────
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS billing_address_line1 text,
  ADD COLUMN IF NOT EXISTS billing_address_line2 text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_state text,
  ADD COLUMN IF NOT EXISTS billing_zip text,
  ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS expected_monthly_clients text,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS tax_id text;

-- ── Profile-level contact info ──────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- ── Update bootstrap_account to accept new fields ───────────────────────────
CREATE OR REPLACE FUNCTION public.bootstrap_account(
  p_owner_id uuid,
  p_company_name text,
  p_slug citext,
  p_plan_type plan_type,
  p_phone text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_industry text DEFAULT NULL,
  p_billing_address_line1 text DEFAULT NULL,
  p_billing_address_line2 text DEFAULT NULL,
  p_billing_city text DEFAULT NULL,
  p_billing_state text DEFAULT NULL,
  p_billing_zip text DEFAULT NULL,
  p_billing_country text DEFAULT 'US',
  p_team_size text DEFAULT NULL,
  p_expected_monthly_clients text DEFAULT NULL,
  p_referral_source text DEFAULT NULL,
  p_tax_id text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_partner_id uuid;
  v_tier plan_tier := 'free';
BEGIN
  INSERT INTO public.partners (
    slug, name, plan_type, plan_tier, submissions_monthly_limit, created_by,
    phone, website, industry,
    billing_address_line1, billing_address_line2, billing_city, billing_state, billing_zip, billing_country,
    team_size, expected_monthly_clients, referral_source, tax_id
  )
  VALUES (
    p_slug, p_company_name, p_plan_type, v_tier,
    CASE WHEN v_tier = 'free' THEN 1 ELSE NULL END,
    p_owner_id,
    p_phone, p_website, p_industry,
    p_billing_address_line1, p_billing_address_line2, p_billing_city, p_billing_state, p_billing_zip, p_billing_country,
    p_team_size, p_expected_monthly_clients, p_referral_source, p_tax_id
  )
  RETURNING id INTO v_partner_id;

  INSERT INTO public.partner_members (partner_id, user_id, role)
  VALUES (v_partner_id, p_owner_id, 'partner_owner')
  ON CONFLICT DO NOTHING;

  -- Promote profile role so dashboard UI treats them correctly.
  UPDATE public.profiles SET role = 'partner_owner', phone = p_phone WHERE id = p_owner_id;

  RETURN v_partner_id;
END $$;
