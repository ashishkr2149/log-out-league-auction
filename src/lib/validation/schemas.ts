import { z } from 'zod';

// ============================================================
// Tournament schemas
// ============================================================
export const tournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(100),
  season: z.string().min(1, 'Season is required').max(50),
  description: z.string().max(500).optional().nullable(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color'),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color'),
});

export type TournamentFormData = z.infer<typeof tournamentSchema>;

// ============================================================
// Team schemas
// ============================================================
export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  short_name: z.string().min(1, 'Short name is required').max(10),
  captain_name: z.string().min(1, 'Captain name is required').max(100),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color'),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color'),
  initial_purse: z.number().int().positive('Purse must be positive'),
  max_roster_size: z.number().int().min(1, 'At least 1 roster slot required'),
  min_roster_size: z.number().int().min(1).optional().nullable(),
});

export type TeamFormData = z.infer<typeof teamSchema>;

// ============================================================
// Player schemas
// ============================================================
export const playerRoles = [
  'batter', 'bowler', 'all-rounder', 'wicketkeeper', 'wicketkeeper-batter', 'other'
] as const;

export const battingStyles = ['right-hand', 'left-hand'] as const;

export const bowlingStyles = [
  'right-arm-fast', 'right-arm-medium', 'left-arm-fast', 'left-arm-medium',
  'right-arm-off-spin', 'right-arm-leg-spin', 'left-arm-orthodox', 'left-arm-chinaman', 'other'
] as const;

export const playerSchema = z.object({
  name: z.string().min(1, 'Player name is required').max(100),
  display_name: z.string().min(1, 'Display name is required').max(50),
  jersey_number: z.string().max(10).optional().nullable(),
  role: z.enum(playerRoles),
  batting_style: z.enum(battingStyles).optional().nullable(),
  bowling_style: z.enum(bowlingStyles).optional().nullable(),
  base_price: z.number().int().min(0, 'Base price cannot be negative'),
  category: z.string().max(50).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  previous_team: z.string().max(100).optional().nullable(),
  auction_order: z.number().int().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type PlayerFormData = z.infer<typeof playerSchema>;

// ============================================================
// Auction schemas
// ============================================================
export const auctionSchema = z.object({
  name: z.string().min(1, 'Auction name is required').max(100),
  currency_code: z.string().min(1).max(5),
  default_bid_increment: z.number().int().positive('Bid increment must be positive'),
});

export type AuctionFormData = z.infer<typeof auctionSchema>;

// ============================================================
// Bid schemas
// ============================================================
export const bidSchema = z.object({
  auction_id: z.string().uuid(),
  team_id: z.string().uuid(),
  amount: z.number().int().positive('Bid amount must be positive'),
  state_version: z.number().int().min(0, 'State version is required'),
});

export type BidFormData = z.infer<typeof bidSchema>;

// ============================================================
// Sell schemas
// ============================================================
export const sellSchema = z.object({
  auction_id: z.string().uuid(),
  auction_player_id: z.string().uuid(),
  team_id: z.string().uuid(),
  final_price: z.number().int().positive('Final price must be positive'),
  state_version: z.number().int().min(0),
});

export type SellFormData = z.infer<typeof sellSchema>;

// ============================================================
// Overlay config schemas
// ============================================================
export const overlayConfigSchema = z.object({
  layout: z.enum(['side-panel', 'full-width', 'bottom-bar']).default('side-panel'),
  theme: z.string().default('dark'),
  configuration_json: z.object({
    panelPosition: z.enum(['right', 'left', 'bottom', 'center']).default('right'),
    panelWidth: z.number().int().min(200).max(800).default(400),
    panelHeight: z.number().int().min(200).max(1080).default(600),
    panelBackground: z.string().default('rgba(10, 10, 30, 0.92)'),
    accentColor: z.string().default('#e94560'),
    primaryTextColor: z.string().default('#ffffff'),
    secondaryTextColor: z.string().default('#b0b0b0'),
    fontScale: z.number().min(0.5).max(2.0).default(1.0),
    borderRadius: z.number().int().min(0).max(50).default(12),
    logoPath: z.string().optional().nullable(),
    playerPhotoSize: z.number().int().min(50).max(500).default(200),
    visibleFields: z.array(z.string()).default(['name', 'role', 'base_price', 'current_bid', 'team']),
    animationEnabled: z.boolean().default(true),
    animationDuration: z.number().int().min(0).max(2000).default(500),
  }),
});

export type OverlayConfigFormData = z.infer<typeof overlayConfigSchema>;

// ============================================================
// CSV Import schema
// ============================================================
export const csvPlayerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  display_name: z.string().optional(),
  jersey_number: z.string().optional(),
  role: z.enum(playerRoles).default('other'),
  batting_style: z.enum(battingStyles).optional(),
  bowling_style: z.enum(bowlingStyles).optional(),
  base_price: z.union([z.number(), z.string()]).transform((v) => {
    const num = typeof v === 'string' ? parseInt(v, 10) : v;
    if (isNaN(num) || num < 0) throw new Error('Invalid base price');
    return num;
  }),
  category: z.string().optional(),
  bio: z.string().optional(),
  previous_team: z.string().optional(),
});

export type CSVPlayerData = z.infer<typeof csvPlayerSchema>;
