import { describe, expect, it } from 'vitest';
import { makeQrSlug } from '@/lib/teams/global';

describe('makeQrSlug', () => {
  it('slugifies short names and appends a suffix', () => {
    const slug = makeQrSlug('Team A', 'abcdef12xxxx');
    expect(slug).toMatch(/^team-a-[a-z0-9]+$/);
  });

  it('falls back when short name is empty', () => {
    const slug = makeQrSlug('   ', 'zzzzzzzz');
    expect(slug.startsWith('team-')).toBe(true);
  });
});
