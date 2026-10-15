import { describe, expect, it } from 'vitest';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';

describe('sanitizeRedirectPath', () => {
  it('defaults empty values to /dashboard', () => {
    expect(sanitizeRedirectPath(null)).toBe('/dashboard');
    expect(sanitizeRedirectPath(undefined)).toBe('/dashboard');
    expect(sanitizeRedirectPath('')).toBe('/dashboard');
  });

  it('allows relative app paths', () => {
    expect(sanitizeRedirectPath('/dashboard/tournaments')).toBe(
      '/dashboard/tournaments'
    );
    expect(sanitizeRedirectPath('/dashboard/auctions/abc/control')).toBe(
      '/dashboard/auctions/abc/control'
    );
  });

  it('rejects open redirects', () => {
    expect(sanitizeRedirectPath('https://evil.example')).toBe('/dashboard');
    expect(sanitizeRedirectPath('//evil.example')).toBe('/dashboard');
    expect(sanitizeRedirectPath('/\\evil.example')).toBe('/dashboard');
    expect(sanitizeRedirectPath('dashboard')).toBe('/dashboard');
  });

  it('rejects login redirect loops', () => {
    expect(sanitizeRedirectPath('/login')).toBe('/dashboard');
    expect(sanitizeRedirectPath('/login?x=1')).toBe('/dashboard');
  });
});
