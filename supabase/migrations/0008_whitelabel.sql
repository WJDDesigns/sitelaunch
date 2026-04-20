-- White-label branding columns for partners
-- Paid plans and above can customize branding on their client-facing pages.

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS hide_branding      boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_footer_text  text,
  ADD COLUMN IF NOT EXISTS logo_size           text     NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS theme_mode          text     NOT NULL DEFAULT 'dark';

-- logo_size: 'default' | 'large' | 'full-width'
-- theme_mode: 'dark' | 'light' | 'auto' (for the client-facing form)

COMMENT ON COLUMN partners.hide_branding     IS 'Hide the linqme footer on client-facing pages (paid+ only)';
COMMENT ON COLUMN partners.custom_footer_text IS 'Custom footer text replacing "linqme. The Cosmic Curator."';
COMMENT ON COLUMN partners.logo_size         IS 'Logo display size on onboarding pages: default, large, full-width';
COMMENT ON COLUMN partners.theme_mode        IS 'Theme for client-facing forms: dark, light, auto';
