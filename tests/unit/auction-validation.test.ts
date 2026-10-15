import { describe, it, expect } from 'vitest';
import {
  validateBidEligibility,
  validateBidIncrement,
  formatCurrency,
  formatIndianNumber,
  getRoleLabel,
  getCaptainSlot,
  getEffectiveRosterCount,
  getAuctionSlotsRemaining,
} from '@/lib/auction/validation';
import type { TeamWithStats } from '@/types/database';

function makeTeam(overrides: Partial<TeamWithStats> = {}): TeamWithStats {
  return {
    id: 'team-1',
    tournament_id: 'tournament-1',
    global_team_id: 'global-team-1',
    name: 'Royal Strikers',
    short_name: 'RST',
    captain_name: null,
    captain_player_id: null,
    captain_person_id: null,
    logo_path: null,
    primary_color: '#3498db',
    secondary_color: '#ffffff',
    initial_purse: 10000000,
    max_roster_size: 15,
    min_roster_size: null,
    is_active: true,
    created_at: '',
    updated_at: '',
    spent: 0,
    remaining_purse: 10000000,
    roster_count: 0,
    ...overrides,
  };
}

describe('Bid Eligibility Validation', () => {
  it('accepts valid bid from eligible team', () => {
    const team = makeTeam({ remaining_purse: 5000000, roster_count: 3 });
    expect(validateBidEligibility(team, 200000, 100000)).toBeNull();
  });

  it('rejects bid from inactive team', () => {
    const team = makeTeam({ is_active: false });
    const result = validateBidEligibility(team, 200000, 100000);
    expect(result).toContain('not active');
  });

  it('rejects bid below base price', () => {
    const team = makeTeam();
    const result = validateBidEligibility(team, 50000, 100000);
    expect(result).toContain('below base price');
  });

  it('rejects bid exceeding remaining purse', () => {
    const team = makeTeam({ remaining_purse: 100000 });
    const result = validateBidEligibility(team, 200000, 100000);
    expect(result).toContain('insufficient funds');
  });

  it('rejects bid when roster is full', () => {
    const team = makeTeam({ roster_count: 15, max_roster_size: 15 });
    const result = validateBidEligibility(team, 200000, 100000);
    expect(result).toContain('full roster');
  });

  it('rejects bid when bought players + captain fill the roster', () => {
    const team = makeTeam({
      roster_count: 5,
      max_roster_size: 6,
      captain_name: 'Ankit',
    });
    const result = validateBidEligibility(team, 200000, 100000);
    expect(result).toContain('full roster');
  });

  it('allows bid when one auction slot remains beside captain', () => {
    const team = makeTeam({
      roster_count: 4,
      max_roster_size: 6,
      captain_name: 'Ankit',
      remaining_purse: 5000000,
    });
    expect(validateBidEligibility(team, 200000, 100000)).toBeNull();
  });
});

describe('Captain roster counting', () => {
  it('counts captain as one roster slot', () => {
    expect(getCaptainSlot({ captain_name: 'Ankit' })).toBe(1);
    expect(getCaptainSlot({ captain_name: '  ' })).toBe(0);
    expect(getCaptainSlot({ captain_name: null })).toBe(0);
  });

  it('includes captain in effective roster (5 bought + captain = 6)', () => {
    const team = makeTeam({
      roster_count: 5,
      max_roster_size: 6,
      captain_name: 'Rohit',
    });
    expect(getEffectiveRosterCount(team)).toBe(6);
    expect(getAuctionSlotsRemaining(team)).toBe(0);
  });
});

describe('Bid Increment Validation', () => {
  it('accepts first bid at base price', () => {
    expect(validateBidIncrement(null, 100000, 100000, 50000)).toBeNull();
  });

  it('accepts first bid above base price', () => {
    expect(validateBidIncrement(null, 200000, 100000, 50000)).toBeNull();
  });

  it('rejects first bid below base price', () => {
    const result = validateBidIncrement(null, 50000, 100000, 50000);
    expect(result).toContain('at least');
  });

  it('accepts bid with valid increment', () => {
    expect(validateBidIncrement(200000, 300000, 100000, 100000)).toBeNull();
  });

  it('rejects bid not higher than current', () => {
    const result = validateBidIncrement(200000, 200000, 100000, 50000);
    expect(result).toContain('must be higher');
  });

  it('rejects bid lower than current', () => {
    const result = validateBidIncrement(200000, 150000, 100000, 50000);
    expect(result).toContain('must be higher');
  });

  it('rejects bid with insufficient increment', () => {
    const result = validateBidIncrement(200000, 220000, 100000, 50000);
    expect(result).toContain('less than minimum');
  });
});

describe('Currency Formatting', () => {
  it('formats INR amounts correctly', () => {
    expect(formatCurrency(100000, 'INR')).toBe('₹1,00,000');
    expect(formatCurrency(10000000, 'INR')).toBe('₹1,00,00,000');
    expect(formatCurrency(500, 'INR')).toBe('₹500');
  });

  it('formats Indian numbers', () => {
    expect(formatIndianNumber(1000)).toBe('1,000');
    expect(formatIndianNumber(100000)).toBe('1,00,000');
    expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
    expect(formatIndianNumber(123)).toBe('123');
  });
});

describe('Role Labels', () => {
  it('returns correct labels', () => {
    expect(getRoleLabel('batter')).toBe('Batter');
    expect(getRoleLabel('bowler')).toBe('Bowler');
    expect(getRoleLabel('all-rounder')).toBe('All-Rounder');
    expect(getRoleLabel('wicketkeeper')).toBe('Wicketkeeper');
    expect(getRoleLabel('wicketkeeper-batter')).toBe('WK-Batter');
    expect(getRoleLabel('other')).toBe('Other');
  });

  it('returns raw string for unknown role', () => {
    expect(getRoleLabel('unknown')).toBe('unknown');
  });
});
