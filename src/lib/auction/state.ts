import { AuctionStatus } from '@/types/database';

/**
 * Valid auction state transitions.
 * Key: current state, Value: array of allowed next states.
 */
const VALID_TRANSITIONS: Record<AuctionStatus, AuctionStatus[]> = {
  draft: ['ready'],
  ready: ['live'],
  live: ['paused', 'completed'],
  paused: ['live', 'completed'],
  completed: [],
  cancelled: [],
};

export function isValidTransition(
  currentStatus: AuctionStatus,
  newStatus: AuctionStatus
): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

export function getAvailableTransitions(currentStatus: AuctionStatus): AuctionStatus[] {
  return VALID_TRANSITIONS[currentStatus] ?? [];
}

export function canAcceptBids(status: AuctionStatus): boolean {
  return status === 'live';
}

export function canModifyPlayers(status: AuctionStatus): boolean {
  return status === 'draft' || status === 'ready';
}
