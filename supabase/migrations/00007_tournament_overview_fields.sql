ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_teams INTEGER;

COMMENT ON COLUMN tournaments.location IS 'Venue / city shown on tournament overview';
COMMENT ON COLUMN tournaments.starts_at IS 'Scheduled start for overview display';
COMMENT ON COLUMN tournaments.max_teams IS 'Max teams allowed (null = unlimited)';
