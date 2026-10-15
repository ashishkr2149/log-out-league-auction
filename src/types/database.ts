// Database types matching the Supabase schema
// All monetary values are stored as integers (whole rupees for INR)

export type TournamentStatus = 'draft' | 'active' | 'completed' | 'archived';

/** Ball/format — stats never mix across these. */
export type MatchType = 'tennis_ball' | 'leather_ball' | 'box_cricket';
/** `admin` is a legacy alias for `organizer`. */
export type TournamentMemberRole =
  | 'admin'
  | 'organizer'
  | 'operator'
  | 'scorer'
  | 'umpire'
  | 'team_manager'
  | 'viewer';

export type PersonClaimStatus = 'unclaimed' | 'claimed';

export interface Person {
  id: string;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  auth_user_id: string | null;
  claim_status: PersonClaimStatus;
  /** Always true for provisioned/claimed humans — staff roles are additive. */
  is_player: boolean;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
}

export type TeamMembershipRole = 'member' | 'captain' | 'manager';

export interface GlobalTeam {
  id: string;
  name: string;
  short_name: string | null;
  description: string | null;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  created_by_person_id: string | null;
  qr_slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  id: string;
  global_team_id: string;
  person_id: string;
  role: TeamMembershipRole;
  created_at: string;
}

export interface Notification {
  id: string;
  person_id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface TournamentCaptainInvite {
  id: string;
  tournament_id: string;
  person_id: string;
  invited_by_person_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  entry_team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentRoleAssignment {
  id: string;
  tournament_id: string;
  person_id: string;
  role: TournamentMemberRole;
  granted_by_person_id: string | null;
  created_at: string;
}

export type PlatformStaffRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type PlatformServiceKey =
  | 'tournaments'
  | 'auctions'
  | 'overlays'
  | 'matches'
  | 'billing'
  | 'users';

export type PlayerRole = 'batter' | 'bowler' | 'all-rounder' | 'wicketkeeper' | 'wicketkeeper-batter' | 'other';
export type BattingStyle = 'right-hand' | 'left-hand';
export type BowlingStyle = 'right-arm-fast' | 'right-arm-medium' | 'left-arm-fast' | 'left-arm-medium' | 'right-arm-off-spin' | 'right-arm-leg-spin' | 'left-arm-orthodox' | 'left-arm-chinaman' | 'other';
export type PlayerStatus = 'registered' | 'queued' | 'in_auction' | 'sold' | 'unsold' | 'withdrawn';

export type AuctionStatus = 'draft' | 'ready' | 'live' | 'paused' | 'completed' | 'cancelled';
export type AuctionPlayerStatus = 'queued' | 'nominated' | 'bidding' | 'sold' | 'unsold';
export type AuctionPhase = 'standby' | 'player_intro' | 'bidding' | 'sold' | 'unsold' | 'paused' | 'completed';
export type PurchaseStatus = 'confirmed' | 'corrected';

export type AuctionEventType =
  | 'player_nominated'
  | 'bidding_started'
  | 'bid_placed'
  | 'leading_team_changed'
  | 'bid_corrected'
  | 'player_sold'
  | 'player_unsold'
  | 'auction_paused'
  | 'auction_resumed'
  | 'player_advanced'
  | 'auction_started'
  | 'auction_completed'
  | 'sale_corrected'
  | 'undo_action';

export type TournamentAccessMode = 'private' | 'open';

export interface Tournament {
  id: string;
  name: string;
  season: string;
  description: string | null;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  status: TournamentStatus;
  match_type: MatchType;
  /** private = members only; open = discoverable / joinable as viewer */
  access_mode: TournamentAccessMode;
  /** When false, pure viewers (spectators) cannot see purse amounts */
  viewers_can_see_purse: boolean;
  location: string | null;
  starts_at: string | null;
  max_teams: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentMember {
  id: string;
  tournament_id: string;
  user_id: string;
  role: TournamentMemberRole;
  created_at: string;
}

/** Tournament team entry (auction purse/roster). Linked to a global franchise. */
export interface Team {
  id: string;
  tournament_id: string;
  global_team_id: string;
  name: string;
  short_name: string;
  captain_name: string | null;
  captain_player_id: string | null;
  captain_person_id: string | null;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  initial_purse: number;
  max_roster_size: number;
  min_roster_size: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformStaff {
  id: string;
  user_id: string;
  person_id: string | null;
  role: PlatformStaffRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OverlayCredential {
  id: string;
  auction_id: string;
  credential_hash: string;
  label: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface Player {
  id: string;
  tournament_id: string;
  person_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  name: string;
  display_name: string;
  jersey_number: string | null;
  photo_path: string | null;
  role: PlayerRole;
  batting_style: BattingStyle | null;
  bowling_style: BowlingStyle | null;
  base_price: number;
  category: string | null;
  bio: string | null;
  previous_team: string | null;
  auction_order: number | null;
  status: PlayerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Auction {
  id: string;
  tournament_id: string;
  name: string;
  status: AuctionStatus;
  currency_code: string;
  default_bid_increment: number;
  current_player_id: string | null;
  current_bid_amount: number | null;
  current_bid_team_id: string | null;
  current_phase: AuctionPhase;
  state_version: number;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuctionPlayer {
  id: string;
  auction_id: string;
  player_id: string;
  auction_order: number;
  base_price: number;
  status: AuctionPlayerStatus;
  final_sale_price: number | null;
  winning_team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  auction_player_id: string;
  team_id: string;
  amount: number;
  sequence_number: number;
  operator_id: string;
  created_at: string;
}

export interface AuctionPurchase {
  id: string;
  auction_id: string;
  auction_player_id: string;
  player_id: string;
  team_id: string;
  final_price: number;
  status: PurchaseStatus;
  sold_at: string;
  corrected_at: string | null;
  created_at: string;
}

export interface TeamRoster {
  id: string;
  tournament_id: string;
  team_id: string;
  player_id: string;
  auction_id: string;
  purchase_id: string;
  purchase_price: number;
  created_at: string;
}

export interface AuctionEvent {
  id: string;
  auction_id: string;
  sequence_number: number;
  event_type: AuctionEventType;
  player_id: string | null;
  team_id: string | null;
  actor_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface OverlayConfig {
  id: string;
  auction_id: string;
  layout: 'side-panel' | 'full-width' | 'bottom-bar';
  theme: string;
  configuration_json: OverlayConfiguration;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OverlayCredential {
  id: string;
  auction_id: string;
  credential_hash: string;
  token: string; // only returned on creation, not stored in DB
  label: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface AuctionOperatorAssignment {
  id: string;
  auction_id: string;
  user_id: string;
  created_at: string;
}

// Overlay configuration shape
export interface OverlayConfiguration {
  panelPosition: 'right' | 'left' | 'bottom' | 'center';
  panelWidth: number;
  panelHeight: number;
  panelBackground: string;
  accentColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  fontScale: number;
  borderRadius: number;
  logoPath: string | null;
  playerPhotoSize: number;
  visibleFields: string[];
  animationEnabled: boolean;
  animationDuration: number;
}

// Computed/joined types for the frontend
export interface TeamWithStats extends Team {
  spent: number;
  remaining_purse: number;
  roster_count: number;
}

export interface AuctionPlayerWithDetails extends AuctionPlayer {
  player: Player;
  winning_team?: Team;
}

// Public overlay state (safe to expose to OBS)
export interface OverlayPublicState {
  auction_id: string;
  auction_name: string;
  tournament_name: string;
  tournament_logo: string | null;
  phase: AuctionPhase;
  current_player: {
    name: string;
    display_name: string;
    jersey_number: string | null;
    photo_url: string | null;
    role: PlayerRole;
    base_price: number;
  } | null;
  current_bid: number | null;
  current_team: {
    name: string;
    short_name: string;
    captain_name: string | null;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
  } | null;
  final_price: number | null;
  currency_code: string;
  state_version: number;
  updated_at: string;
}
