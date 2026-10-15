-- Phase 1.85: tournament match format (tennis / leather / box)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'tennis_ball'
    CHECK (match_type IN ('tennis_ball', 'leather_ball', 'box_cricket'));

COMMENT ON COLUMN tournaments.match_type IS 'Ball/format type; stats must not mix across types';
