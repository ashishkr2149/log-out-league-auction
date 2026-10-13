-- Log Out League Auction Platform
-- Initial database schema migration
-- All monetary values are stored as integers (whole rupees for INR)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TOURNAMENTS
-- ============================================================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  description TEXT,
  logo_path TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1a1a2e',
  secondary_color TEXT NOT NULL DEFAULT '#e94560',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TOURNAMENT MEMBERS (role-based access)
-- ============================================================
CREATE TABLE tournament_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_path TEXT,
  primary_color TEXT NOT NULL DEFAULT '#3498db',
  secondary_color TEXT NOT NULL DEFAULT '#ffffff',
  initial_purse INTEGER NOT NULL DEFAULT 10000000
    CHECK (initial_purse > 0),
  max_roster_size INTEGER NOT NULL DEFAULT 15
    CHECK (max_roster_size > 0),
  min_roster_size INTEGER DEFAULT NULL
    CHECK (min_roster_size IS NULL OR min_roster_size > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, name),
  UNIQUE(tournament_id, short_name)
);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  jersey_number TEXT,
  photo_path TEXT,
  role TEXT NOT NULL DEFAULT 'other'
    CHECK (role IN ('batter', 'bowler', 'all-rounder', 'wicketkeeper', 'wicketkeeper-batter', 'other')),
  batting_style TEXT
    CHECK (batting_style IS NULL OR batting_style IN ('right-hand', 'left-hand')),
  bowling_style TEXT
    CHECK (bowling_style IS NULL OR bowling_style IN (
      'right-arm-fast', 'right-arm-medium', 'left-arm-fast', 'left-arm-medium',
      'right-arm-off-spin', 'right-arm-leg-spin', 'left-arm-orthodox', 'left-arm-chinaman', 'other'
    )),
  base_price INTEGER NOT NULL DEFAULT 100000
    CHECK (base_price >= 0),
  category TEXT,
  bio TEXT,
  previous_team TEXT,
  auction_order INTEGER,
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'queued', 'in_auction', 'sold', 'unsold', 'withdrawn')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUCTIONS
-- ============================================================
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'live', 'paused', 'completed', 'cancelled')),
  currency_code TEXT NOT NULL DEFAULT 'INR',
  default_bid_increment INTEGER NOT NULL DEFAULT 100000
    CHECK (default_bid_increment > 0),
  current_player_id UUID REFERENCES players(id),
  current_bid_amount INTEGER,
  current_bid_team_id UUID REFERENCES teams(id),
  current_phase TEXT NOT NULL DEFAULT 'standby'
    CHECK (current_phase IN ('standby', 'player_intro', 'bidding', 'sold', 'unsold', 'paused', 'completed')),
  state_version INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUCTION PLAYERS (join table)
-- ============================================================
CREATE TABLE auction_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  auction_order INTEGER NOT NULL DEFAULT 0,
  base_price INTEGER NOT NULL
    CHECK (base_price >= 0),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'nominated', 'bidding', 'sold', 'unsold')),
  final_sale_price INTEGER,
  winning_team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auction_id, player_id)
);

-- ============================================================
-- AUCTION BIDS (immutable bid history)
-- ============================================================
CREATE TABLE auction_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  auction_player_id UUID NOT NULL REFERENCES auction_players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  sequence_number INTEGER NOT NULL,
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUCTION PURCHASES
-- ============================================================
CREATE TABLE auction_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  auction_player_id UUID NOT NULL REFERENCES auction_players(id),
  player_id UUID NOT NULL REFERENCES players(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  final_price INTEGER NOT NULL CHECK (final_price > 0),
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'corrected')),
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  corrected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate active purchases for same player in same auction
CREATE UNIQUE INDEX idx_unique_active_purchase
  ON auction_purchases(auction_id, player_id)
  WHERE status = 'confirmed';

-- ============================================================
-- TEAM ROSTER
-- ============================================================
CREATE TABLE team_roster (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES auction_purchases(id),
  purchase_price INTEGER NOT NULL CHECK (purchase_price > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, team_id, player_id)
);

-- ============================================================
-- AUCTION EVENTS (immutable audit log)
-- ============================================================
CREATE TABLE auction_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'player_nominated', 'bidding_started', 'bid_placed',
      'leading_team_changed', 'bid_corrected', 'player_sold',
      'player_unsold', 'auction_paused', 'auction_resumed',
      'player_advanced', 'auction_started', 'auction_completed',
      'sale_corrected', 'undo_action'
    )),
  player_id UUID REFERENCES players(id),
  team_id UUID REFERENCES teams(id),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure sequential event numbering per auction
CREATE UNIQUE INDEX idx_auction_event_sequence
  ON auction_events(auction_id, sequence_number);

-- ============================================================
-- OVERLAY CONFIGURATIONS
-- ============================================================
CREATE TABLE overlay_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  layout TEXT NOT NULL DEFAULT 'side-panel'
    CHECK (layout IN ('side-panel', 'full-width', 'bottom-bar')),
  theme TEXT NOT NULL DEFAULT 'dark',
  configuration_json JSONB NOT NULL DEFAULT '{
    "panelPosition": "right",
    "panelWidth": 220,
    "panelHeight": 600,
    "panelBackground": "rgba(10, 10, 30, 0.92)",
    "accentColor": "#e94560",
    "primaryTextColor": "#ffffff",
    "secondaryTextColor": "#b0b0b0",
    "fontScale": 1.0,
    "borderRadius": 12,
    "logoPath": null,
    "playerPhotoSize": 200,
    "visibleFields": ["name", "role", "base_price", "current_bid", "team"],
    "animationEnabled": true,
    "animationDuration": 500
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- OVERLAY CREDENTIALS
-- ============================================================
CREATE TABLE overlay_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  credential_hash TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_overlay_credential_hash ON overlay_credentials(credential_hash);

-- ============================================================
-- AUCTION OPERATOR ASSIGNMENTS
-- ============================================================
CREATE TABLE auction_operator_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auction_id, user_id)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_tournament_members_user ON tournament_members(user_id);
CREATE INDEX idx_tournament_members_tournament ON tournament_members(tournament_id);
CREATE INDEX idx_teams_tournament ON teams(tournament_id);
CREATE INDEX idx_players_tournament ON players(tournament_id);
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_auctions_tournament ON auctions(tournament_id);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auction_players_auction ON auction_players(auction_id);
CREATE INDEX idx_auction_players_status ON auction_players(status);
CREATE INDEX idx_auction_bids_auction ON auction_bids(auction_id);
CREATE INDEX idx_auction_bids_player ON auction_bids(auction_player_id);
CREATE INDEX idx_auction_purchases_auction ON auction_purchases(auction_id);
CREATE INDEX idx_auction_purchases_team ON auction_purchases(team_id);
CREATE INDEX idx_team_roster_team ON team_roster(team_id);
CREATE INDEX idx_team_roster_tournament ON team_roster(tournament_id);
CREATE INDEX idx_auction_events_auction ON auction_events(auction_id);
CREATE INDEX idx_auction_events_type ON auction_events(event_type);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auction_players_updated_at
  BEFORE UPDATE ON auction_players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overlay_configs_updated_at
  BEFORE UPDATE ON overlay_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Calculate team's total spending from confirmed purchases
CREATE OR REPLACE FUNCTION get_team_spending(p_team_id UUID, p_auction_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(final_price), 0)::INTEGER
  FROM auction_purchases
  WHERE team_id = p_team_id
    AND auction_id = p_auction_id
    AND status = 'confirmed';
$$ LANGUAGE sql STABLE;

-- Calculate team's remaining purse
CREATE OR REPLACE FUNCTION get_team_remaining_purse(p_team_id UUID, p_auction_id UUID)
RETURNS INTEGER AS $$
  SELECT t.initial_purse - get_team_spending(p_team_id, p_auction_id)
  FROM teams t
  WHERE t.id = p_team_id;
$$ LANGUAGE sql STABLE;

-- Count team's roster for a tournament
CREATE OR REPLACE FUNCTION get_team_roster_count(p_team_id UUID, p_tournament_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM team_roster
  WHERE team_id = p_team_id
    AND tournament_id = p_tournament_id;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_operator_assignments ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is a tournament member with given roles
CREATE OR REPLACE FUNCTION is_tournament_member(p_tournament_id UUID, p_roles TEXT[] DEFAULT ARRAY['admin', 'operator', 'viewer'])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tournament_members
    WHERE tournament_id = p_tournament_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: check if user is an auction operator
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
      AND tm.role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- TOURNAMENTS: members can read, admins can write
CREATE POLICY "Tournament members can view" ON tournaments
  FOR SELECT USING (
    is_tournament_member(id, ARRAY['admin', 'operator', 'viewer'])
    OR created_by = auth.uid()
  );

CREATE POLICY "Creators and admins can insert" ON tournaments
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update" ON tournaments
  FOR UPDATE USING (
    is_tournament_member(id, ARRAY['admin'])
    OR created_by = auth.uid()
  );

-- TOURNAMENT MEMBERS
CREATE POLICY "Members can view members" ON tournament_members
  FOR SELECT USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'operator', 'viewer'])
  );

CREATE POLICY "Admins can manage members" ON tournament_members
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin'])
    OR EXISTS (
      SELECT 1 FROM tournaments WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can update members" ON tournament_members
  FOR UPDATE USING (
    is_tournament_member(tournament_id, ARRAY['admin'])
  );

CREATE POLICY "Admins can delete members" ON tournament_members
  FOR DELETE USING (
    is_tournament_member(tournament_id, ARRAY['admin'])
  );

-- TEAMS: tournament members can view, admins can write
CREATE POLICY "Tournament members can view teams" ON teams
  FOR SELECT USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'operator', 'viewer'])
  );

CREATE POLICY "Admins can manage teams" ON teams
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin'])
  );

CREATE POLICY "Admins can update teams" ON teams
  FOR UPDATE USING (
    is_tournament_member(tournament_id, ARRAY['admin'])
  );

-- PLAYERS: tournament members can view, admins can write
CREATE POLICY "Tournament members can view players" ON players
  FOR SELECT USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'operator', 'viewer'])
  );

CREATE POLICY "Admins can manage players" ON players
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin'])
  );

CREATE POLICY "Admins can update players" ON players
  FOR UPDATE USING (
    is_tournament_member(tournament_id, ARRAY['admin'])
  );

-- AUCTIONS: tournament members can view, admins/operators can write
CREATE POLICY "Tournament members can view auctions" ON auctions
  FOR SELECT USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'operator', 'viewer'])
  );

CREATE POLICY "Admins can create auctions" ON auctions
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin'])
  );

CREATE POLICY "Operators can update auctions" ON auctions
  FOR UPDATE USING (
    is_auction_operator(id)
  );

-- AUCTION PLAYERS
CREATE POLICY "Members can view auction players" ON auction_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'operator', 'viewer'])
    )
  );

CREATE POLICY "Admins can manage auction players" ON auction_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin'])
    )
  );

CREATE POLICY "Operators can update auction players" ON auction_players
  FOR UPDATE USING (
    is_auction_operator(auction_id)
  );

-- AUCTION BIDS
CREATE POLICY "Members can view bids" ON auction_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'operator', 'viewer'])
    )
  );

CREATE POLICY "Operators can place bids" ON auction_bids
  FOR INSERT WITH CHECK (
    is_auction_operator(auction_id)
  );

-- AUCTION PURCHASES
CREATE POLICY "Members can view purchases" ON auction_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'operator', 'viewer'])
    )
  );

CREATE POLICY "Operators can manage purchases" ON auction_purchases
  FOR INSERT WITH CHECK (
    is_auction_operator(auction_id)
  );

CREATE POLICY "Admins can update purchases" ON auction_purchases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin'])
    )
  );

-- TEAM ROSTER
CREATE POLICY "Members can view roster" ON team_roster
  FOR SELECT USING (
    is_tournament_member(tournament_id, ARRAY['admin', 'operator', 'viewer'])
  );

CREATE POLICY "Operators can manage roster" ON team_roster
  FOR INSERT WITH CHECK (
    is_tournament_member(tournament_id, ARRAY['admin', 'operator'])
  );

CREATE POLICY "Admins can delete roster entries" ON team_roster
  FOR DELETE USING (
    is_tournament_member(tournament_id, ARRAY['admin'])
  );

-- AUCTION EVENTS (immutable audit log)
CREATE POLICY "Members can view events" ON auction_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'operator', 'viewer'])
    )
  );

CREATE POLICY "Operators can create events" ON auction_events
  FOR INSERT WITH CHECK (
    is_auction_operator(auction_id)
  );

-- OVERLAY CONFIGS
CREATE POLICY "Members can view overlay configs" ON overlay_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'operator', 'viewer'])
    )
  );

CREATE POLICY "Admins can manage overlay configs" ON overlay_configs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin'])
    )
  );

CREATE POLICY "Admins can update overlay configs" ON overlay_configs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin'])
    )
  );

-- OVERLAY CREDENTIALS
CREATE POLICY "Admins can view credentials" ON overlay_credentials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin'])
    )
  );

CREATE POLICY "Admins can manage credentials" ON overlay_credentials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin'])
    )
  );

CREATE POLICY "Admins can update credentials" ON overlay_credentials
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin'])
    )
  );

-- AUCTION OPERATOR ASSIGNMENTS
CREATE POLICY "Members can view assignments" ON auction_operator_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin', 'operator', 'viewer'])
    )
  );

CREATE POLICY "Admins can manage assignments" ON auction_operator_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin'])
    )
  );

CREATE POLICY "Admins can delete assignments" ON auction_operator_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.id = auction_id
        AND is_tournament_member(a.tournament_id, ARRAY['admin'])
    )
  );

-- ============================================================
-- STORAGE BUCKETS (created via Supabase Dashboard or CLI)
-- These comments document the required buckets and policies.
-- Apply these via the Supabase Dashboard > Storage.
-- ============================================================

-- Bucket: player-photos (public read, authenticated upload)
-- Bucket: team-logos (public read, authenticated upload)
-- Bucket: tournament-assets (public read, authenticated upload)

-- ============================================================
-- REALTIME PUBLICATION
-- Enable realtime for tables that the overlay needs to watch.
-- ============================================================
-- In Supabase Dashboard > Database > Replication:
-- Enable the following tables for Realtime:
--   auctions, auction_players, overlay_configs
