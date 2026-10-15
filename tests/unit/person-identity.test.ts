import { describe, expect, it } from 'vitest';
import {
  TOURNAMENT_ROLE_RANK,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
} from '@/lib/auth/person';
import { ASSIGNABLE_TOURNAMENT_ROLES } from '@/lib/auth/permissions';
import { playerSchema } from '@/lib/validation/schemas';

describe('person contact helpers', () => {
  it('normalizes email to lowercase trimmed', () => {
    expect(normalizeEmail('  Alex@Example.COM ')).toBe('alex@example.com');
  });

  it('validates basic emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@x.com')).toBe(false);
  });

  it('strips non-digit phone chars except +', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
  });
});

describe('tournament role ranks', () => {
  it('ranks organizer above scorer and viewer', () => {
    expect(TOURNAMENT_ROLE_RANK.organizer).toBeGreaterThan(
      TOURNAMENT_ROLE_RANK.scorer
    );
    expect(TOURNAMENT_ROLE_RANK.scorer).toBeGreaterThan(
      TOURNAMENT_ROLE_RANK.viewer
    );
  });

  it('includes umpire in assignable roles', () => {
    expect(ASSIGNABLE_TOURNAMENT_ROLES).toContain('umpire');
    expect(ASSIGNABLE_TOURNAMENT_ROLES).toContain('scorer');
    expect(ASSIGNABLE_TOURNAMENT_ROLES).not.toContain('admin');
  });
});

describe('playerSchema contact fields', () => {
  it('allows empty email as local-only player', () => {
    const parsed = playerSchema.parse({
      name: 'Test Player',
      display_name: 'Test',
      role: 'batter',
      base_price: 1,
      contact_email: '',
      contact_phone: '',
    });
    expect(parsed.contact_email).toBe('');
    expect(parsed.contact_phone).toBe('');
  });

  it('accepts claimable email', () => {
    const parsed = playerSchema.parse({
      name: 'Test Player',
      display_name: 'Test',
      role: 'batter',
      base_price: 1,
      contact_email: 'claim.me@example.com',
    });
    expect(parsed.contact_email).toBe('claim.me@example.com');
  });
});
