-- Announcements system: admin-created banners shown to targeted user groups

-- Announcement type determines banner color styling
CREATE TYPE public.announcement_type AS ENUM ('info', 'warning', 'success', 'urgent');

-- Target audience for the announcement
CREATE TYPE public.announcement_audience AS ENUM ('all', 'partners', 'agency_owners', 'superadmins');

CREATE TABLE public.announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  message     text NOT NULL,
  icon        text NOT NULL DEFAULT 'fa-bullhorn',
  type        public.announcement_type NOT NULL DEFAULT 'info',
  audience    public.announcement_audience NOT NULL DEFAULT 'all',
  is_active   boolean NOT NULL DEFAULT true,
  scheduled_at timestamptz DEFAULT NULL,
  expires_at  timestamptz DEFAULT NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Track which users have dismissed which announcements
CREATE TABLE public.announcement_dismissals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_announcements_active ON public.announcements (is_active, scheduled_at, expires_at);
CREATE INDEX idx_announcement_dismissals_user ON public.announcement_dismissals (user_id);

-- RLS policies
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active announcements
CREATE POLICY "Authenticated users can read announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

-- Only superadmins can insert/update/delete announcements (enforced in app)
CREATE POLICY "Service role manages announcements"
  ON public.announcements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own dismissals
CREATE POLICY "Users can read own dismissals"
  ON public.announcement_dismissals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own dismissals
CREATE POLICY "Users can dismiss announcements"
  ON public.announcement_dismissals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role full access on dismissals
CREATE POLICY "Service role manages dismissals"
  ON public.announcement_dismissals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
