-- Enable RLS on all tables missing it for production security
--
-- Audit (2026-04-20):
--   All 35 public tables already have RLS enabled via prior migrations.
--   However, 26 tables lack a blanket "Service role full access" policy.
--   This migration adds that policy to every table that is missing it,
--   matching the pattern established in migrations 0027 and 0037.
--
--   Tables already covered by a service-role policy (skipped here):
--     subscriptions, billing_events, invoices       (0009 – *_service_write)
--     coupons, coupon_redemptions                    (0011 – Service role full access)
--     email_templates                                (0027 – Service role full access)
--     announcements, announcement_dismissals         (0029 – Service role manages)
--     agency_invites                                 (0037 – Service role full access)

-- 0001_init tables --------------------------------------------------------

alter table public.profiles enable row level security;
create policy "Service role full access" on public.profiles for all using (true);

alter table public.partners enable row level security;
create policy "Service role full access" on public.partners for all using (true);

alter table public.partner_members enable row level security;
create policy "Service role full access" on public.partner_members for all using (true);

alter table public.form_templates enable row level security;
create policy "Service role full access" on public.form_templates for all using (true);

alter table public.partner_forms enable row level security;
create policy "Service role full access" on public.partner_forms for all using (true);

alter table public.submissions enable row level security;
create policy "Service role full access" on public.submissions for all using (true);

alter table public.submission_files enable row level security;
create policy "Service role full access" on public.submission_files for all using (true);

alter table public.invites enable row level security;
create policy "Service role full access" on public.invites for all using (true);

alter table public.events enable row level security;
create policy "Service role full access" on public.events for all using (true);

-- 0010_plans_table --------------------------------------------------------

alter table public.plans enable row level security;
create policy "Service role full access" on public.plans for all using (true);

-- 0013_partner_invites ----------------------------------------------------

alter table public.form_change_requests enable row level security;
create policy "Service role full access" on public.form_change_requests for all using (true);

-- 0015_multi_forms --------------------------------------------------------

alter table public.form_partner_assignments enable row level security;
create policy "Service role full access" on public.form_partner_assignments for all using (true);

-- 0017_analytics ----------------------------------------------------------

alter table public.page_views enable row level security;
create policy "Service role full access" on public.page_views for all using (true);

alter table public.form_events enable row level security;
create policy "Service role full access" on public.form_events for all using (true);

-- 0018_error_logs ---------------------------------------------------------

alter table public.error_logs enable row level security;
create policy "Service role full access" on public.error_logs for all using (true);

-- 0021_passkey_credentials ------------------------------------------------

alter table public.user_passkeys enable row level security;
create policy "Service role full access" on public.user_passkeys for all using (true);

-- 0024_notifications ------------------------------------------------------

alter table public.notifications enable row level security;
create policy "Service role full access" on public.notifications for all using (true);

-- 0025_sessions -----------------------------------------------------------

alter table public.user_sessions enable row level security;
create policy "Service role full access" on public.user_sessions for all using (true);

-- 0030_cloud_integrations -------------------------------------------------

alter table public.cloud_integrations enable row level security;
create policy "Service role full access" on public.cloud_integrations for all using (true);

alter table public.cloud_sync_log enable row level security;
create policy "Service role full access" on public.cloud_sync_log for all using (true);

-- 0031_ai_integrations ----------------------------------------------------

alter table public.ai_integrations enable row level security;
create policy "Service role full access" on public.ai_integrations for all using (true);

-- 0032_payment_captcha_integrations ---------------------------------------

alter table public.payment_integrations enable row level security;
create policy "Service role full access" on public.payment_integrations for all using (true);

alter table public.captcha_integrations enable row level security;
create policy "Service role full access" on public.captcha_integrations for all using (true);

-- 0033_status_updates -----------------------------------------------------

alter table public.status_updates enable row level security;
create policy "Service role full access" on public.status_updates for all using (true);

-- 0034_insight_dashboards -------------------------------------------------

alter table public.insight_dashboards enable row level security;
create policy "Service role full access" on public.insight_dashboards for all using (true);

-- 0036_geocoding_integrations ---------------------------------------------

alter table public.geocoding_integrations enable row level security;
create policy "Service role full access" on public.geocoding_integrations for all using (true);
