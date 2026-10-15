-- Phase 1.75: unified person identity — pre-provision, claim, multi-role

-- ============================================================
-- PERSONS (canonical human identity; may exist without auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL DEFAULT '',
  primary_email TEXT,
  primary_phone TEXT,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  claim_status TEXT NOT NULL DEFAULT 'unclaimed'
    CHECK (claim_status IN ('unclaimed', 'claimed')),
  avatar_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT persons_email_or_phone CHECK (
    primary_email IS NOT NULL OR primary_phone IS NOT NULL OR auth_user_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_primary_email
  ON persons (lower(primary_email))
  WHERE primary_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_primary_phone
  ON persons (primary_phone)
  WHERE primary_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_persons_auth_user ON persons(auth_user_id);

DROP TRIGGER IF EXISTS update_persons_updated_at ON persons;
CREATE TRIGGER update_persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TOURNAMENT ROLE ASSIGNMENTS (multi-role per person)
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN (
      'admin', 'organizer', 'operator', 'scorer', 'umpire',
      'team_manager', 'viewer'
    )),
  granted_by_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, person_id, role)
);

CREATE INDEX IF NOT EXISTS idx_tra_tournament ON tournament_role_assignments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tra_person ON tournament_role_assignments(person_id);

-- Expand legacy membership check to include umpire (compat table)
ALTER TABLE tournament_members
  DROP CONSTRAINT IF EXISTS tournament_members_role_check;

ALTER TABLE tournament_members
  ADD CONSTRAINT tournament_members_role_check
  CHECK (role IN (
    'admin', 'organizer', 'operator', 'scorer', 'umpire',
    'team_manager', 'viewer'
  ));

-- ============================================================
-- PLAYERS ↔ PERSON
-- ============================================================
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_players_person ON players(person_id);

-- ============================================================
-- PLATFORM STAFF ↔ PERSON
-- ============================================================
ALTER TABLE platform_staff
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES persons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_platform_staff_person ON platform_staff(person_id);

-- ============================================================
-- BACKFILL: one claimed person per existing auth user
-- ============================================================
INSERT INTO persons (display_name, primary_email, auth_user_id, claim_status)
SELECT
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'display_name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(u.email, '@', 1),
    'User'
  ),
  lower(u.email),
  u.id,
  'claimed'
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM persons p WHERE p.auth_user_id = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM persons p WHERE p.primary_email = lower(u.email)
  );

-- Link platform_staff to persons
UPDATE platform_staff ps
SET person_id = p.id
FROM persons p
WHERE p.auth_user_id = ps.user_id
  AND ps.person_id IS NULL;

-- Backfill role assignments from tournament_members
INSERT INTO tournament_role_assignments (tournament_id, person_id, role)
SELECT tm.tournament_id, p.id, tm.role
FROM tournament_members tm
JOIN persons p ON p.auth_user_id = tm.user_id
ON CONFLICT (tournament_id, person_id, role) DO NOTHING;

-- ============================================================
-- RLS HELPERS: membership via assignments OR legacy members
-- ============================================================
CREATE OR REPLACE FUNCTION is_tournament_member(
  p_tournament_id UUID,
  p_roles TEXT[] DEFAULT ARRAY[
    'admin', 'organizer', 'operator', 'scorer', 'umpire', 'team_manager', 'viewer'
  ]
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tournament_members
    WHERE tournament_id = p_tournament_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  ) OR EXISTS (
    SELECT 1
    FROM tournament_role_assignments tra
    JOIN persons p ON p.id = tra.person_id
    WHERE tra.tournament_id = p_tournament_id
      AND p.auth_user_id = auth.uid()
      AND tra.role = ANY(p_roles)
  ) OR EXISTS (
    SELECT 1 FROM tournaments
    WHERE id = p_tournament_id
      AND created_by = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_tournament_organizer(p_tournament_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_tournament_member(p_tournament_id, ARRAY['admin', 'organizer']);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_auction_operator(p_auction_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auction_operator_assignments
    WHERE auction_id = p_auction_id
      AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM auctions a
    WHERE a.id = p_auction_id
      AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer'])
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- RLS: persons
-- ============================================================
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own person" ON persons;
CREATE POLICY "Users can view own person" ON persons
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR is_platform_staff(ARRAY['owner', 'admin', 'editor', 'viewer'])
    OR EXISTS (
      SELECT 1
      FROM tournament_role_assignments tra
      JOIN persons me ON me.auth_user_id = auth.uid()
      JOIN tournament_role_assignments mine
        ON mine.tournament_id = tra.tournament_id
       AND mine.person_id = me.id
      WHERE tra.person_id = persons.id
        AND mine.role IN ('admin', 'organizer', 'team_manager', 'operator', 'scorer')
    )
    OR EXISTS (
      SELECT 1 FROM tournaments t
      JOIN tournament_role_assignments tra ON tra.tournament_id = t.id
      WHERE tra.person_id = persons.id
        AND t.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own person" ON persons;
CREATE POLICY "Users can update own person" ON persons
  FOR UPDATE USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ============================================================
-- RLS: tournament_role_assignments
-- ============================================================
ALTER TABLE tournament_role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view role assignments" ON tournament_role_assignments;
CREATE POLICY "Members can view role assignments" ON tournament_role_assignments
  FOR SELECT USING (
    is_tournament_member(
      tournament_id,
      ARRAY['admin', 'organizer', 'operator', 'scorer', 'umpire', 'team_manager', 'viewer']
    )
    OR EXISTS (
      SELECT 1 FROM persons p
      WHERE p.id = person_id AND p.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organizers can manage role assignments" ON tournament_role_assignments;
CREATE POLICY "Organizers can manage role assignments" ON tournament_role_assignments
  FOR ALL USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer'])
  )
  WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer'])
  );

-- Note: inserts for unclaimed persons / dual-write use service role from the app.
