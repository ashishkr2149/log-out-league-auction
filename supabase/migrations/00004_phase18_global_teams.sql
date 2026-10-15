-- Phase 1.8: player-first + global teams
-- Existing `teams` rows become tournament entries linked to `global_teams`.

-- ============================================================
-- PERSON: player-first
-- ============================================================
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS is_player BOOLEAN NOT NULL DEFAULT true;

UPDATE persons SET is_player = true WHERE is_player IS DISTINCT FROM true;

-- ============================================================
-- GLOBAL TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS global_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  logo_path TEXT,
  primary_color TEXT NOT NULL DEFAULT '#3498db',
  secondary_color TEXT NOT NULL DEFAULT '#ffffff',
  created_by_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  qr_slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_teams_name ON global_teams (lower(name));
CREATE INDEX IF NOT EXISTS idx_global_teams_creator ON global_teams(created_by_person_id);

DROP TRIGGER IF EXISTS update_global_teams_updated_at ON global_teams;
CREATE TRIGGER update_global_teams_updated_at
  BEFORE UPDATE ON global_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TEAM MEMBERSHIPS (global squad)
-- ============================================================
CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  global_team_id UUID NOT NULL REFERENCES global_teams(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'captain', 'manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (global_team_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_person ON team_memberships(person_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON team_memberships(global_team_id);

-- ============================================================
-- TEAMS TABLE = tournament entries (keep auction FKs)
-- ============================================================
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS global_team_id UUID REFERENCES global_teams(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS captain_person_id UUID REFERENCES persons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_global ON teams(global_team_id);

-- ============================================================
-- CAPTAIN INVITES + NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_captain_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  invited_by_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  entry_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, person_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_person_created
  ON notifications(person_id, created_at DESC);

-- ============================================================
-- PROMOTE existing tournament teams → global_teams + link
-- ============================================================
INSERT INTO global_teams (
  name, short_name, logo_path, primary_color, secondary_color,
  created_by_person_id, qr_slug
)
SELECT
  t.name,
  t.short_name,
  t.logo_path,
  t.primary_color,
  t.secondary_color,
  (
    SELECT p.id FROM tournaments tr
    JOIN persons p ON p.auth_user_id = tr.created_by
    WHERE tr.id = t.tournament_id
    LIMIT 1
  ),
  lower(regexp_replace(
    coalesce(nullif(trim(t.short_name), ''), 'team') || '-' || substr(t.id::text, 1, 8),
    '[^a-z0-9]+', '-', 'g'
  ))
FROM teams t
WHERE t.global_team_id IS NULL
ON CONFLICT (qr_slug) DO NOTHING;

-- Link by matching name+short within tournament creator promote (1:1 by slug suffix = team id prefix)
UPDATE teams t
SET global_team_id = g.id
FROM global_teams g
WHERE t.global_team_id IS NULL
  AND g.qr_slug = lower(regexp_replace(
    coalesce(nullif(trim(t.short_name), ''), 'team') || '-' || substr(t.id::text, 1, 8),
    '[^a-z0-9]+', '-', 'g'
  ));

-- Fallback: any still unlinked get a fresh global team
DO $$
DECLARE
  r RECORD;
  gid UUID;
  slug TEXT;
BEGIN
  FOR r IN SELECT * FROM teams WHERE global_team_id IS NULL LOOP
    slug := 'team-' || substr(r.id::text, 1, 12);
    INSERT INTO global_teams (name, short_name, logo_path, primary_color, secondary_color, qr_slug)
    VALUES (r.name, r.short_name, r.logo_path, r.primary_color, r.secondary_color, slug)
    RETURNING id INTO gid;
    UPDATE teams SET global_team_id = gid WHERE id = r.id;
  END LOOP;
END $$;

-- Creator as manager membership when known
INSERT INTO team_memberships (global_team_id, person_id, role)
SELECT g.id, g.created_by_person_id, 'manager'
FROM global_teams g
WHERE g.created_by_person_id IS NOT NULL
ON CONFLICT (global_team_id, person_id) DO NOTHING;

ALTER TABLE teams
  ALTER COLUMN global_team_id SET NOT NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE global_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_captain_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view global teams" ON global_teams;
CREATE POLICY "Anyone authenticated can view global teams" ON global_teams
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers can update global teams" ON global_teams;
CREATE POLICY "Managers can update global teams" ON global_teams
  FOR UPDATE TO authenticated USING (
    created_by_person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN persons p ON p.id = tm.person_id
      WHERE tm.global_team_id = global_teams.id
        AND p.auth_user_id = auth.uid()
        AND tm.role IN ('captain', 'manager')
    )
  );

DROP POLICY IF EXISTS "Authenticated can create global teams" ON global_teams;
CREATE POLICY "Authenticated can create global teams" ON global_teams
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Members can view memberships" ON team_memberships;
CREATE POLICY "Members can view memberships" ON team_memberships
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers can manage memberships" ON team_memberships;
CREATE POLICY "Managers can manage memberships" ON team_memberships
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM global_teams g
      JOIN persons p ON p.id = g.created_by_person_id
      WHERE g.id = team_memberships.global_team_id AND p.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN persons p ON p.id = tm.person_id
      WHERE tm.global_team_id = team_memberships.global_team_id
        AND p.auth_user_id = auth.uid()
        AND tm.role IN ('captain', 'manager')
    )
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT TO authenticated USING (
    person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE TO authenticated USING (
    person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tournament members view captain invites" ON tournament_captain_invites;
CREATE POLICY "Tournament members view captain invites" ON tournament_captain_invites
  FOR SELECT TO authenticated USING (
    is_tournament_member(tournament_id, ARRAY['admin','organizer','operator','scorer','umpire','team_manager','viewer'])
    OR person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
  );
