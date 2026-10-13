import { TeamWithStats } from '@/types/database';

/**
 * Validate that a team can accept a bid of the given amount.
 * Returns null if valid, or an error message string.
 */
export function validateBidEligibility(
  team: TeamWithStats,
  bidAmount: number,
  basePrice: number
): string | null {
  if (!team.is_active) {
    return `${team.name} is not active`;
  }

  if (bidAmount < basePrice) {
    return `Bid ₹${bidAmount.toLocaleString()} is below base price ₹${basePrice.toLocaleString()}`;
  }

  if (bidAmount > team.remaining_purse) {
    return `${team.name} has insufficient funds. Remaining: ₹${team.remaining_purse.toLocaleString()}, Bid: ₹${bidAmount.toLocaleString()}`;
  }

  if (team.roster_count >= team.max_roster_size) {
    return `${team.name} has reached maximum roster size (${team.max_roster_size})`;
  }

  return null;
}

/**
 * Validate that the bid increment is valid.
 */
export function validateBidIncrement(
  currentBid: number | null,
  newBid: number,
  basePrice: number,
  defaultIncrement: number
): string | null {
  if (currentBid === null || currentBid === 0) {
    // First bid must be at least the base price
    if (newBid < basePrice) {
      return `First bid must be at least ₹${basePrice.toLocaleString()}`;
    }
    return null;
  }

  if (newBid <= currentBid) {
    return `New bid ₹${newBid.toLocaleString()} must be higher than current bid ₹${currentBid.toLocaleString()}`;
  }

  const increment = newBid - currentBid;
  if (increment < defaultIncrement) {
    return `Bid increment ₹${increment.toLocaleString()} is less than minimum ₹${defaultIncrement.toLocaleString()}`;
  }

  return null;
}

/**
 * Format currency amount for display.
 * Uses whole rupees for INR.
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    // Indian number formatting with lakhs/crores
    return '₹' + formatIndianNumber(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number in Indian numbering system (lakhs, crores).
 */
export function formatIndianNumber(num: number): string {
  const str = num.toString();
  if (str.length <= 3) return str;

  let result = str.slice(-3);
  let remaining = str.slice(0, -3);

  while (remaining.length > 0) {
    const chunk = remaining.slice(-2);
    result = chunk + ',' + result;
    remaining = remaining.slice(0, -2);
  }

  return result;
}

/**
 * Get display label for player role.
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    'batter': 'Batter',
    'bowler': 'Bowler',
    'all-rounder': 'All-Rounder',
    'wicketkeeper': 'Wicketkeeper',
    'wicketkeeper-batter': 'WK-Batter',
    'other': 'Other',
  };
  return labels[role] ?? role;
}

/**
 * Get display label for auction status.
 */
export function getAuctionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'draft': 'Draft',
    'ready': 'Ready',
    'live': 'Live',
    'paused': 'Paused',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };
  return labels[status] ?? status;
}

/**
 * Get display label for player auction status.
 */
export function getPlayerStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'registered': 'Registered',
    'queued': 'Queued',
    'in_auction': 'In Auction',
    'sold': 'Sold',
    'unsold': 'Unsold',
    'withdrawn': 'Withdrawn',
    'nominated': 'Nominated',
    'bidding': 'Bidding',
  };
  return labels[status] ?? status;
}
