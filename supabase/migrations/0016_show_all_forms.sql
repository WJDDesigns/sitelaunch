-- Allow partners to show all forms on their landing page instead of just the default
ALTER TABLE partners ADD COLUMN IF NOT EXISTS show_all_forms boolean NOT NULL DEFAULT false;
