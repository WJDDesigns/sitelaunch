-- Add cname_target column to store the Vercel-recommended CNAME target per partner
ALTER TABLE partners ADD COLUMN IF NOT EXISTS cname_target text;
