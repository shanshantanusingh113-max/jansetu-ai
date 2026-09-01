-- Advanced feature columns:
--   complaints.photo_url            photo attachment upload (local demo; nullable here)
--   tickets.status_history          JSON timeline of status changes (audit + citizen timeline)
--   tickets.feedback_rating / _comment / _at   citizen feedback after resolution
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS feedback_rating INTEGER;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS feedback_comment TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;