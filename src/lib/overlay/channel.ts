/** Shared Realtime channel name for auction → overlay live updates. */
export function auctionOverlayChannelName(auctionId: string) {
  return `auction-overlay:${auctionId}`;
}

export const OVERLAY_STATE_EVENT = 'auction_state';
