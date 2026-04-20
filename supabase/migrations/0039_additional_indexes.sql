-- Additional indexes for production query performance
--
-- 1. submissions(partner_id, submitted_at DESC) — accelerates date-range
--    analytics queries that filter by partner and range-scan on submitted_at
--    (e.g. admin dashboard "this month" counts, insights exports).
--
-- 2. submissions(partner_form_id) — accelerates per-form entry listings,
--    assignment lookups, and change-request queries that filter by form.
--
-- 3. submissions(partner_id, created_at DESC) — many dashboard queries filter
--    by partner_id and ORDER BY created_at DESC without filtering on status,
--    so the existing 3-column compound index (partner_id, status, created_at)
--    cannot be used efficiently for these queries.

-- Date-range analytics per partner (submitted_at)
CREATE INDEX IF NOT EXISTS idx_submissions_partner_submitted
  ON submissions (partner_id, submitted_at DESC);

-- Per-form entry lookups
CREATE INDEX IF NOT EXISTS idx_submissions_partner_form_id
  ON submissions (partner_form_id);

-- Dashboard listings ordered by created_at within a partner
CREATE INDEX IF NOT EXISTS idx_submissions_partner_created
  ON submissions (partner_id, created_at DESC);
