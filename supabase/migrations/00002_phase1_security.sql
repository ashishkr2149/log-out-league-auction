-- Phase 1: authz foundations — platform IAM, overlay audit, captain player link,
-- expanded tournament roles (admin kept as organizer alias).

-- ============================================================
-- TOURNAMENT ROLES: allow organizer / scorer / team_manager
-- ============================================================
ALTER TABLE tournament_members
  DROP CONSTRAINT IF EXISTS tournament_members_role_check;

ALTER TABLE tournament_members
  ADD CONSTRAINT tournament_members_role_check
  CHECK (role IN ('admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer'));

-- Treat legacy admin as organizer going forward (keep admin rows for RLS compat)
UPDATE tournament_members SET role = 'organizer' WHERE role = 'admin';

-- Creator rows that were inserted as admin should already be updated above.
-- Keep inserting 'organizer' from the app; RLS helpers accept both.

CREATE OR REPLACE FUNCTION is_tournament_organizer(p_tournament_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tournament_members
    WHERE tournament_id = p_tournament_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'organizer')
  ) OR EXISTS (
    SELECT 1 FROM tournaments
    WHERE id = p_tournament_id
      AND created_by = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_auction_operator(p_auction_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auction_operator_assignments
    WHERE auction_id = p_auction_id
      AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM auctions a
    JOIN tournament_members tm ON tm.tournament_id = a.tournament_id
    WHERE a.id = p_auction_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'organizer')
  ) OR EXISTS (
    SELECT 1 FROM auctions a
    JOIN tournaments t ON t.id = a.tournament_id
    WHERE a.id = p_auction_id
      AND t.created_by = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Expand member role arrays used by RLS to include organizer + new roles for reads
CREATE OR REPLACE FUNCTION is_tournament_member(
  p_tournament_id UUID,
  p_roles TEXT[] DEFAULT ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tournament_members
    WHERE tournament_id = p_tournament_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  ) OR EXISTS (
    SELECT 1 FROM tournaments
    WHERE id = p_tournament_id
      AND created_by = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update write policies that only listed admin to also accept organizer
DROP POLICY IF EXISTS "Admins can manage teams" ON teams;
CREATE POLICY "Admins can manage teams" ON teams
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer', 'team_manager'])
  );

DROP POLICY IF EXISTS "Admins can update teams" ON teams;
CREATE POLICY "Admins can update teams" ON teams
  FOR UPDATE USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer', 'team_manager'])
  );

DROP POLICY IF EXISTS "Admins can manage players" ON players;
CREATE POLICY "Admins can manage players" ON players
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer', 'team_manager'])
  );

DROP POLICY IF EXISTS "Admins can update players" ON players;
CREATE POLICY "Admins can update players" ON players
  FOR UPDATE USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer', 'team_manager'])
  );

DROP POLICY IF EXISTS "Admins can create auctions" ON auctions;
CREATE POLICY "Admins can create auctions" ON auctions
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer'])
  );

DROP POLICY IF EXISTS "Admins can manage auction players" ON auction_players;
CREATE POLICY "Admins can manage auction players" ON auction_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer'])
    )
  );

DROP POLICY IF EXISTS "Admins can update purchases" ON auction_purchases;
CREATE POLICY "Admins can update purchases" ON auction_purchases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer'])
    )
  );

DROP POLICY IF EXISTS "Admins can delete roster entries" ON team_roster;
CREATE POLICY "Admins can delete roster entries" ON team_roster
  FOR DELETE USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer'])
  );

DROP POLICY IF EXISTS "Admins can manage overlay configs" ON overlay_configs;
CREATE POLICY "Admins can manage overlay configs" ON overlay_configs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer', 'operator'])
    )
  );

DROP POLICY IF EXISTS "Admins can update overlay configs" ON overlay_configs;
CREATE POLICY "Admins can update overlay configs" ON overlay_configs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer', 'operator'])
    )
  );

DROP POLICY IF EXISTS "Admins can view credentials" ON overlay_credentials;
CREATE POLICY "Admins can view credentials" ON overlay_credentials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer', 'operator'])
    )
  );

DROP POLICY IF EXISTS "Admins can manage credentials" ON overlay_credentials;
CREATE POLICY "Admins can manage credentials" ON overlay_credentials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer', 'operator'])
    )
  );

DROP POLICY IF EXISTS "Admins can update credentials" ON overlay_credentials;
CREATE POLICY "Admins can update credentials" ON overlay_credentials
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer', 'operator'])
    )
  );

DROP POLICY IF EXISTS "Admins can update" ON tournaments;
CREATE POLICY "Admins can update" ON tournaments
  FOR UPDATE USING (
    is_tournament_member(id, ARRAY['admin', 'organizer'])
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can manage members" ON tournament_members;
CREATE POLICY "Admins can manage members" ON tournament_members
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer'])
  );

DROP POLICY IF EXISTS "Admins can update members" ON tournament_members;
CREATE POLICY "Admins can update members" ON tournament_members
  FOR UPDATE USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer'])
  );

DROP POLICY IF EXISTS "Admins can delete members" ON tournament_members;
CREATE POLICY "Admins can delete members" ON tournament_members
  FOR DELETE USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer'])
  );

-- Expand every SELECT / membership policy that still listed only admin|operator|viewer
-- so organizer / scorer / team_manager keep access after the admin→organizer migrate.
DO $$
DECLARE
  member_roles TEXT[] := ARRAY[
    'admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer'
  ];
BEGIN
  -- no-op placeholder; policies recreated below with explicit SQL for clarity
  PERFORM 1;
END $$;

DROP POLICY IF EXISTS "Tournament members can view" ON tournaments;
CREATE POLICY "Tournament members can view" ON tournaments
  FOR SELECT USING (
    is_tournament_member(
      id,
      ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
    )
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members can view members" ON tournament_members;
CREATE POLICY "Members can view members" ON tournament_members
  FOR SELECT USING (
    is_tournament_member(
      tournament_id,
      ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
    )
  );

DROP POLICY IF EXISTS "Tournament members can view teams" ON teams;
CREATE POLICY "Tournament members can view teams" ON teams
  FOR SELECT USING (
    is_tournament_member(
      tournament_id,
      ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
    )
  );

DROP POLICY IF EXISTS "Tournament members can view players" ON players;
CREATE POLICY "Tournament members can view players" ON players
  FOR SELECT USING (
    is_tournament_member(
      tournament_id,
      ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
    )
  );

DROP POLICY IF EXISTS "Tournament members can view auctions" ON auctions;
CREATE POLICY "Tournament members can view auctions" ON auctions
  FOR SELECT USING (
    is_tournament_member(
      tournament_id,
      ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
    )
  );

DROP POLICY IF EXISTS "Members can view auction players" ON auction_players;
CREATE POLICY "Members can view auction players" ON auction_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(
          a.tournament_id,
          ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
        )
    )
  );

DROP POLICY IF EXISTS "Members can view bids" ON auction_bids;
CREATE POLICY "Members can view bids" ON auction_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(
          a.tournament_id,
          ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
        )
    )
  );

DROP POLICY IF EXISTS "Members can view purchases" ON auction_purchases;
CREATE POLICY "Members can view purchases" ON auction_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(
          a.tournament_id,
          ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
        )
    )
  );

DROP POLICY IF EXISTS "Members can view roster" ON team_roster;
CREATE POLICY "Members can view roster" ON team_roster
  FOR SELECT USING (
    is_tournament_member(
      tournament_id,
      ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
    )
  );

DROP POLICY IF EXISTS "Operators can manage roster" ON team_roster;
CREATE POLICY "Operators can manage roster" ON team_roster
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin', 'organizer', 'operator'])
  );

DROP POLICY IF EXISTS "Members can view events" ON auction_events;
CREATE POLICY "Members can view events" ON auction_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(
          a.tournament_id,
          ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
        )
    )
  );

DROP POLICY IF EXISTS "Members can view overlay configs" ON overlay_configs;
CREATE POLICY "Members can view overlay configs" ON overlay_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(
          a.tournament_id,
          ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
        )
    )
  );

DROP POLICY IF EXISTS "Members can view assignments" ON auction_operator_assignments;
CREATE POLICY "Members can view assignments" ON auction_operator_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(
          a.tournament_id,
          ARRAY['admin', 'organizer', 'operator', 'scorer', 'team_manager', 'viewer']
        )
    )
  );

DROP POLICY IF EXISTS "Admins can manage assignments" ON auction_operator_assignments;
CREATE POLICY "Admins can manage assignments" ON auction_operator_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer'])
    )
  );

DROP POLICY IF EXISTS "Admins can delete assignments" ON auction_operator_assignments;
CREATE POLICY "Admins can delete assignments" ON auction_operator_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'organizer'])
    )
  );

-- ============================================================
-- PLATFORM IAM (Owner / Admin / Editor / Viewer)
-- ============================================================
CREATE TABLE platform_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Per-service capability overrides assigned by the owner
CREATE TABLE platform_service_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL
    CHECK (service_key IN ('tournaments', 'auctions', 'overlays', 'matches', 'billing', 'users')),
  can_read BOOLEAN NOT NULL DEFAULT true,
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, service_key)
);

-- Global service kill switches (owner-controlled)
CREATE TABLE platform_services (
  service_key TEXT PRIMARY KEY
    CHECK (service_key IN ('tournaments', 'auctions', 'overlays', 'matches', 'billing', 'users')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO platform_services (service_key, is_enabled) VALUES
  ('tournaments', true),
  ('auctions', true),
  ('overlays', true),
  ('matches', true),
  ('billing', true),
  ('users', true);

ALTER TABLE platform_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_service_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_services ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_platform_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_platform_staff(p_roles TEXT[] DEFAULT ARRAY['owner', 'admin', 'editor', 'viewer'])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY "Staff can view own row" ON platform_staff
  FOR SELECT USING (user_id = auth.uid() OR is_platform_owner());

CREATE POLICY "Owner can manage staff" ON platform_staff
  FOR ALL USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

CREATE POLICY "Staff can view grants" ON platform_service_grants
  FOR SELECT USING (
    is_platform_owner()
    OR EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.id = staff_id AND ps.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can manage grants" ON platform_service_grants
  FOR ALL USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

CREATE POLICY "Authenticated can read service flags" ON platform_services
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner can update service flags" ON platform_services
  FOR UPDATE USING (is_platform_owner());

-- ============================================================
-- OVERLAY CREDENTIAL AUDIT
-- ============================================================
ALTER TABLE overlay_credentials
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users(id);

-- ============================================================
-- CAPTAIN AS REAL PLAYER
-- ============================================================
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS captain_player_id UUID REFERENCES players(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_captain_player
  ON teams(captain_player_id)
  WHERE captain_player_id IS NOT NULL;

-- Backfill: create a player per captain_name and link it
DO $$
DECLARE
  t RECORD;
  new_player_id UUID;
BEGIN
  FOR t IN
    SELECT id, tournament_id, captain_name
    FROM teams
    WHERE captain_name IS NOT NULL
      AND trim(captain_name) <> ''
      AND captain_player_id IS NULL
  LOOP
    SELECT p.id INTO new_player_id
    FROM players p
    WHERE p.tournament_id = t.tournament_id
      AND lower(p.name) = lower(trim(t.captain_name))
    LIMIT 1;

    IF new_player_id IS NULL THEN
      INSERT INTO players (
        tournament_id, name, display_name, role, base_price, status, notes
      ) VALUES (
        t.tournament_id,
        trim(t.captain_name),
        trim(t.captain_name),
        'other',
        0,
        'withdrawn',
        'captain'
      )
      RETURNING id INTO new_player_id;
    ELSE
      UPDATE players
      SET status = 'withdrawn',
          notes = COALESCE(notes, 'captain')
      WHERE id = new_player_id;
    END IF;

    UPDATE teams
    SET captain_player_id = new_player_id
    WHERE id = t.id;
  END LOOP;
END $$;
