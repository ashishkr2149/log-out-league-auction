import { describe, expect, it } from 'vitest';
import {
  AUCTION_OPERATOR_TOURNAMENT_ROLES,
  ORGANIZER_ROLES,
  OVERLAY_MANAGER_ROLES,
  TEAM_MANAGER_ROLES,
  canSeePurseForRole,
  hasMinimumPlatformRole,
  isEmailVerified,
} from '@/lib/auth/permissions';

describe('role matrices', () => {
  it('treats organizer and legacy admin as organizers', () => {
    expect(ORGANIZER_ROLES).toContain('organizer');
    expect(ORGANIZER_ROLES).toContain('admin');
  });

  it('allows organizers to operate auctions; viewers cannot', () => {
    expect(AUCTION_OPERATOR_TOURNAMENT_ROLES).toContain('organizer');
    expect(AUCTION_OPERATOR_TOURNAMENT_ROLES).not.toContain('viewer');
    expect(AUCTION_OPERATOR_TOURNAMENT_ROLES).not.toContain('scorer');
  });

  it('allows organizers and operators to manage overlays; viewers cannot', () => {
    expect(OVERLAY_MANAGER_ROLES).toEqual(
      expect.arrayContaining(['organizer', 'operator', 'admin'])
    );
    expect(OVERLAY_MANAGER_ROLES).not.toContain('viewer');
  });

  it('allows team managers to edit teams/players', () => {
    expect(TEAM_MANAGER_ROLES).toContain('team_manager');
    expect(TEAM_MANAGER_ROLES).not.toContain('viewer');
  });
});

describe('hasMinimumPlatformRole', () => {
  it('enforces owner > admin > editor > viewer', () => {
    expect(hasMinimumPlatformRole('owner', 'admin')).toBe(true);
    expect(hasMinimumPlatformRole('admin', 'editor')).toBe(true);
    expect(hasMinimumPlatformRole('editor', 'viewer')).toBe(true);
    expect(hasMinimumPlatformRole('viewer', 'editor')).toBe(false);
    expect(hasMinimumPlatformRole('admin', 'owner')).toBe(false);
    expect(hasMinimumPlatformRole(null, 'viewer')).toBe(false);
  });
});

describe('isEmailVerified', () => {
  it('requires email_confirmed_at', () => {
    expect(isEmailVerified({ email_confirmed_at: '2026-01-01T00:00:00Z' })).toBe(
      true
    );
    expect(isEmailVerified({ email_confirmed_at: null })).toBe(false);
    expect(isEmailVerified({})).toBe(false);
  });
});

describe('canSeePurseForRole', () => {
  it('hides purse from viewers unless tournament allows it', () => {
    expect(canSeePurseForRole('viewer', false)).toBe(false);
    expect(canSeePurseForRole('viewer', true)).toBe(true);
  });

  it('always allows staff roles to see purse', () => {
    expect(canSeePurseForRole('organizer', false)).toBe(true);
    expect(canSeePurseForRole('operator', false)).toBe(true);
    expect(canSeePurseForRole('team_manager', false)).toBe(true);
    expect(canSeePurseForRole('scorer', false)).toBe(true);
  });

  it('denies when role is missing', () => {
    expect(canSeePurseForRole(null, true)).toBe(false);
  });
});
