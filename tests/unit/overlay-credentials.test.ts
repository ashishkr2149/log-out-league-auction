import { describe, expect, it } from 'vitest';
import {
  defaultOverlayExpiresAt,
  generateOverlayToken,
  hashOverlayToken,
} from '@/lib/overlay/credentials';

describe('overlay credential helpers', () => {
  it('hashes tokens with sha-256 hex', () => {
    const { token, hash } = generateOverlayToken();
    expect(token.length).toBeGreaterThan(20);
    expect(hash).toHaveLength(64);
    expect(hashOverlayToken(token)).toBe(hash);
    expect(hashOverlayToken(token + 'x')).not.toBe(hash);
  });

  it('defaults expiry to 30 days', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const expires = new Date(defaultOverlayExpiresAt(from));
    const diffDays =
      (expires.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(30);
  });
});
