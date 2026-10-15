-- Phase 2: open/private tournaments + viewer purse visibility
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'private'
    CHECK (access_mode IN ('private', 'open')),
  ADD COLUMN IF NOT EXISTS viewers_can_see_purse BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tournaments.access_mode IS
  'private = members only; open = authenticated users can view/join as viewer';
COMMENT ON COLUMN tournaments.viewers_can_see_purse IS
  'When false, tournament viewers cannot see remaining purse amounts';

-- Authenticated users can discover open tournaments (join as viewer separately)
DROP POLICY IF EXISTS "Authenticated can view open tournaments" ON tournaments;
CREATE POLICY "Authenticated can view open tournaments" ON tournaments
  FOR SELECT USING (
    access_mode = 'open' AND auth.uid() IS NOT NULL
  );
