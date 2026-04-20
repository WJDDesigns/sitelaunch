-- ============================================================================
-- linqme — Built-in analytics
-- Migration 0017
-- Tracks page views, form funnel events, and provides the foundation
-- for partner-level and platform-level dashboards.
-- ============================================================================

-- Page views — lightweight, one row per visit
CREATE TABLE IF NOT EXISTS public.page_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  path        text NOT NULL,                    -- e.g. '/', '/f/test-1', '/start/abc'
  referrer    text,                             -- document.referrer
  user_agent  text,
  country     text,                             -- from Vercel headers
  is_unique   boolean NOT NULL DEFAULT true,    -- first visit in session
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast partner + time-range queries
CREATE INDEX IF NOT EXISTS page_views_partner_time_idx ON page_views (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_created_idx ON page_views (created_at DESC);

-- Form funnel events — tracks the submission lifecycle
-- event_type: 'view' (landed on form), 'start' (clicked begin), 'step' (moved to next step),
--             'complete' (submitted), 'abandon' (left without completing)
CREATE TABLE IF NOT EXISTS public.form_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  form_slug       text NOT NULL,
  submission_id   uuid REFERENCES submissions(id) ON DELETE SET NULL,
  event_type      text NOT NULL,
  step_index      int,                          -- which step (for 'step' events)
  metadata        jsonb DEFAULT '{}',           -- extra data (time on step, etc.)
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_events_partner_time_idx ON form_events (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS form_events_form_slug_idx ON form_events (partner_id, form_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS form_events_type_idx ON form_events (event_type, created_at DESC);

-- RLS: partners can only see their own analytics
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_events ENABLE ROW LEVEL SECURITY;

-- Page views: members can read their partner's views
CREATE POLICY "Members can view own page_views"
  ON page_views FOR SELECT
  USING (
    partner_id IN (
      SELECT pm.partner_id FROM partner_members pm WHERE pm.user_id = auth.uid()
    )
  );

-- Superadmins can see all page views
CREATE POLICY "Superadmins can view all page_views"
  ON page_views FOR SELECT
  USING (public.is_superadmin());

-- Form events: members can read their partner's events
CREATE POLICY "Members can view own form_events"
  ON form_events FOR SELECT
  USING (
    partner_id IN (
      SELECT pm.partner_id FROM partner_members pm WHERE pm.user_id = auth.uid()
    )
  );

-- Superadmins can see all form events
CREATE POLICY "Superadmins can view all form_events"
  ON form_events FOR SELECT
  USING (public.is_superadmin());

-- Allow inserts from server (service role) only — no user-facing insert policies
-- The API route / server actions use createAdminClient() to record events

-- ─── Materialized daily stats for fast dashboard queries ───────────────
-- These are refreshed periodically or on-demand

CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_page_views AS
  SELECT
    partner_id,
    date_trunc('day', created_at)::date AS day,
    count(*)::int AS total_views,
    count(*) FILTER (WHERE is_unique)::int AS unique_views,
    path
  FROM page_views
  GROUP BY partner_id, day, path
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS daily_page_views_idx
  ON daily_page_views (partner_id, day, path);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_form_stats AS
  SELECT
    partner_id,
    form_slug,
    date_trunc('day', created_at)::date AS day,
    count(*) FILTER (WHERE event_type = 'view')::int AS views,
    count(*) FILTER (WHERE event_type = 'start')::int AS starts,
    count(*) FILTER (WHERE event_type = 'complete')::int AS completions,
    count(*) FILTER (WHERE event_type = 'abandon')::int AS abandons
  FROM form_events
  GROUP BY partner_id, form_slug, day
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS daily_form_stats_idx
  ON daily_form_stats (partner_id, form_slug, day);
