import { describe, it, expect } from 'vitest';
import { isValidTransition, canAcceptBids, getAvailableTransitions, canModifyPlayers } from '@/lib/auction/state';
import type { AuctionStatus } from '@/types/database';

describe('Auction State Machine', () => {
  describe('isValidTransition', () => {
    it('allows draft -> ready', () => {
      expect(isValidTransition('draft', 'ready')).toBe(true);
    });

    it('allows ready -> live', () => {
      expect(isValidTransition('ready', 'live')).toBe(true);
    });

    it('allows live -> paused', () => {
      expect(isValidTransition('live', 'paused')).toBe(true);
    });

    it('allows live -> completed', () => {
      expect(isValidTransition('live', 'completed')).toBe(true);
    });

    it('allows paused -> live', () => {
      expect(isValidTransition('paused', 'live')).toBe(true);
    });

    it('allows paused -> completed', () => {
      expect(isValidTransition('paused', 'completed')).toBe(true);
    });

    it('rejects draft -> live (must go through ready)', () => {
      expect(isValidTransition('draft', 'live')).toBe(false);
    });

    it('rejects ready -> paused', () => {
      expect(isValidTransition('ready', 'paused')).toBe(false);
    });

    it('rejects completed -> live', () => {
      expect(isValidTransition('completed', 'live')).toBe(false);
    });

    it('rejects completed -> any', () => {
      expect(isValidTransition('completed', 'draft')).toBe(false);
      expect(isValidTransition('completed', 'ready')).toBe(false);
      expect(isValidTransition('completed', 'live')).toBe(false);
      expect(isValidTransition('completed', 'paused')).toBe(false);
    });

    it('rejects cancelled -> any', () => {
      expect(isValidTransition('cancelled', 'draft')).toBe(false);
      expect(isValidTransition('cancelled', 'live')).toBe(false);
    });
  });

  describe('canAcceptBids', () => {
    it('returns true when live', () => {
      expect(canAcceptBids('live')).toBe(true);
    });

    it('returns false when paused', () => {
      expect(canAcceptBids('paused')).toBe(false);
    });

    it('returns false when draft', () => {
      expect(canAcceptBids('draft')).toBe(false);
    });

    it('returns false when completed', () => {
      expect(canAcceptBids('completed')).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('returns [ready] for draft', () => {
      expect(getAvailableTransitions('draft')).toEqual(['ready']);
    });

    it('returns [live] for ready', () => {
      expect(getAvailableTransitions('ready')).toEqual(['live']);
    });

    it('returns [paused, completed] for live', () => {
      expect(getAvailableTransitions('live')).toEqual(['paused', 'completed']);
    });

    it('returns [live, completed] for paused', () => {
      expect(getAvailableTransitions('paused')).toEqual(['live', 'completed']);
    });

    it('returns [] for completed', () => {
      expect(getAvailableTransitions('completed')).toEqual([]);
    });
  });

  describe('canModifyPlayers', () => {
    it('returns true for draft', () => {
      expect(canModifyPlayers('draft')).toBe(true);
    });

    it('returns true for ready', () => {
      expect(canModifyPlayers('ready')).toBe(true);
    });

    it('returns false for live', () => {
      expect(canModifyPlayers('live')).toBe(false);
    });

    it('returns false for completed', () => {
      expect(canModifyPlayers('completed')).toBe(false);
    });
  });
});
