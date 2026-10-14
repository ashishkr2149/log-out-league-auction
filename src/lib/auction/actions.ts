'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/permissions';
import { isValidTransition } from '@/lib/auction/state';
import { getCaptainSlot } from '@/lib/auction/validation';
import {
  AuctionStatus,
  AuctionPhase,
  AuctionEventType,
} from '@/types/database';

export type AuctionActionState = {
  newVersion: number;
  status: AuctionStatus;
  phase: AuctionPhase;
  currentBid: number | null;
  currentTeamId: string | null;
  currentPlayerId: string | null;
};

export type AuctionActionResult =
  | ({ success: true } & AuctionActionState & { purchaseId?: string })
  | { success?: false; error: string };

function toActionState(auction: {
  state_version: number;
  status: string;
  current_phase: string;
  current_bid_amount: number | null;
  current_bid_team_id: string | null;
  current_player_id: string | null;
}): AuctionActionState {
  return {
    newVersion: auction.state_version,
    status: auction.status as AuctionStatus,
    phase: auction.current_phase as AuctionPhase,
    currentBid: auction.current_bid_amount,
    currentTeamId: auction.current_bid_team_id,
    currentPlayerId: auction.current_player_id,
  };
}

async function updateAuctionCas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  auctionId: string,
  stateVersion: number,
  updates: Record<string, unknown>
): Promise<{ ok: true; auction: Record<string, unknown> & {
  state_version: number;
  status: string;
  current_phase: string;
  current_bid_amount: number | null;
  current_bid_team_id: string | null;
  current_player_id: string | null;
} } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('auctions')
    .update({ ...updates, state_version: stateVersion + 1 })
    .eq('id', auctionId)
    .eq('state_version', stateVersion)
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: 'Auction state has changed. Please try again.' };
  }
  return { ok: true, auction: data };
}

// ============================================================
// AUCTION STATE TRANSITIONS
// ============================================================

export async function transitionAuctionStatus(
  auctionId: string,
  newStatus: AuctionStatus,
  stateVersion: number
): Promise<AuctionActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch current auction state
  const { data: auction, error: fetchError } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (fetchError || !auction) {
    return { error: 'Auction not found' };
  }

  // Optimistic concurrency check
  if (auction.state_version !== stateVersion) {
    return { error: 'Auction state has changed. Please refresh and try again.' };
  }

  // Validate state transition
  if (!isValidTransition(auction.status as AuctionStatus, newStatus)) {
    return { error: `Cannot transition from ${auction.status} to ${newStatus}` };
  }

  // Determine phase based on new status
  let newPhase: AuctionPhase = auction.current_phase as AuctionPhase;
  const updates: Record<string, unknown> = {
    status: newStatus,
  };

  if (newStatus === 'live' && auction.status === 'ready') {
    newPhase = 'standby';
    updates.started_at = new Date().toISOString();
  } else if (newStatus === 'live' && auction.status === 'paused') {
    // Prefer bidding if a player is mid-lot; otherwise standby
    newPhase = auction.current_player_id
      ? ((auction.current_phase === 'player_intro' ? 'player_intro' : 'bidding') as AuctionPhase)
      : 'standby';
  } else if (newStatus === 'paused') {
    newPhase = 'paused';
  } else if (newStatus === 'completed') {
    newPhase = 'completed';
    updates.completed_at = new Date().toISOString();
  }
  updates.current_phase = newPhase;

  const updated = await updateAuctionCas(supabase, auctionId, stateVersion, updates);
  if (!updated.ok) return { error: updated.error };

  // Record event
  const eventType: AuctionEventType = newStatus === 'live' && auction.status === 'paused'
    ? 'auction_resumed'
    : newStatus === 'paused'
      ? 'auction_paused'
      : newStatus === 'live'
        ? 'auction_started'
        : 'auction_completed';

  await recordAuctionEvent(supabase, {
    auction_id: auctionId,
    event_type: eventType,
    actor_id: user.id,
    payload: { previous_status: auction.status, new_status: newStatus },
  });

  return { success: true, ...toActionState(updated.auction) };
}

// ============================================================
// NOMINATE PLAYER (select for auction)
// ============================================================

export async function nominatePlayer(
  auctionId: string,
  auctionPlayerId: string,
  stateVersion: number
): Promise<AuctionActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch auction
  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (error || !auction) return { error: 'Auction not found' };
  if (auction.state_version !== stateVersion) {
    return { error: 'Auction state has changed. Please refresh.' };
  }
  if (auction.status !== 'live' && auction.status !== 'ready' && auction.status !== 'paused') {
    return { error: 'Auction is not ready for nominations' };
  }

  // Fetch auction player
  const { data: auctionPlayer, error: apError } = await supabase
    .from('auction_players')
    .select('*, player:players(*)')
    .eq('id', auctionPlayerId)
    .single();

  if (apError || !auctionPlayer) return { error: 'Player not found in auction' };
  if (auctionPlayer.status !== 'queued') {
    return { error: `Player is already ${auctionPlayer.status}` };
  }

  // Reset any previously nominated player back to queued
  if (auction.current_player_id) {
    const { data: currentAP } = await supabase
      .from('auction_players')
      .select('id, status')
      .eq('auction_id', auctionId)
      .eq('player_id', auction.current_player_id)
      .single();

    if (currentAP && (currentAP.status === 'nominated' || currentAP.status === 'bidding')) {
      await supabase
        .from('auction_players')
        .update({ status: 'queued' })
        .eq('id', currentAP.id);
    }
  }

  // Update auction player status
  await supabase
    .from('auction_players')
    .update({ status: 'nominated' })
    .eq('id', auctionPlayerId);

  const updated = await updateAuctionCas(supabase, auctionId, stateVersion, {
    current_player_id: auctionPlayer.player_id,
    current_bid_amount: null,
    current_bid_team_id: null,
    current_phase: 'player_intro',
    status: auction.status === 'ready' ? 'live' : auction.status,
    ...(auction.status === 'ready' ? { started_at: new Date().toISOString() } : {}),
  });
  if (!updated.ok) return { error: updated.error };

  await recordAuctionEvent(supabase, {
    auction_id: auctionId,
    event_type: 'player_nominated',
    player_id: auctionPlayer.player_id,
    actor_id: user.id,
    payload: {
      player_name: auctionPlayer.player?.name,
      base_price: auctionPlayer.base_price,
    },
  });

  return { success: true, ...toActionState(updated.auction) };
}

// ============================================================
// START BIDDING
// ============================================================

export async function startBidding(
  auctionId: string,
  stateVersion: number
): Promise<AuctionActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (error || !auction) return { error: 'Auction not found' };
  if (auction.state_version !== stateVersion) {
    return { error: 'Auction state has changed. Please refresh.' };
  }
  if (auction.status !== 'live') return { error: 'Auction is not live' };
  if (!auction.current_player_id) return { error: 'No player nominated' };
  if (auction.current_phase !== 'player_intro') return { error: 'Cannot start bidding in current phase' };

  // Get the auction player record
  const { data: auctionPlayer } = await supabase
    .from('auction_players')
    .select('id, base_price')
    .eq('auction_id', auctionId)
    .eq('player_id', auction.current_player_id)
    .single();

  if (!auctionPlayer) return { error: 'Auction player not found' };

  // Update auction player to bidding
  await supabase
    .from('auction_players')
    .update({ status: 'bidding' })
    .eq('id', auctionPlayer.id);

  // Opening amount shown, but no team yet — first bid can be at base.
  const updated = await updateAuctionCas(supabase, auctionId, stateVersion, {
    current_bid_amount: auctionPlayer.base_price,
    current_bid_team_id: null,
    current_phase: 'bidding',
  });
  if (!updated.ok) return { error: updated.error };

  await recordAuctionEvent(supabase, {
    auction_id: auctionId,
    event_type: 'bidding_started',
    player_id: auction.current_player_id,
    actor_id: user.id,
    payload: { base_price: auctionPlayer.base_price },
  });

  return { success: true, ...toActionState(updated.auction) };
}

// ============================================================
// PLACE BID
// ============================================================

export async function placeBid(
  auctionId: string,
  teamId: string,
  amount: number,
  stateVersion: number
): Promise<AuctionActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch auction
  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (error || !auction) return { error: 'Auction not found' };
  if (auction.state_version !== stateVersion) {
    return { error: 'Auction state has changed. Please refresh.' };
  }
  if (auction.status !== 'live') return { error: 'Auction is not live' };
  if (auction.current_phase !== 'bidding') return { error: 'Not in bidding phase' };
  if (!auction.current_player_id) return { error: 'No player being auctioned' };

  // Validate bid amount
  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: 'Bid amount must be a positive whole number' };
  }

  const hasLeadingTeam = Boolean(auction.current_bid_team_id);
  if (!hasLeadingTeam) {
    // First team bid can equal the opening/base amount
    if (auction.current_bid_amount !== null && amount < auction.current_bid_amount) {
      return { error: `Bid must be at least ${auction.current_bid_amount}` };
    }
  } else if (auction.current_bid_amount !== null && amount <= auction.current_bid_amount) {
    return { error: `Bid must be higher than current bid ${auction.current_bid_amount}` };
  }

  // Fetch team and validate eligibility
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (teamError || !team) return { error: 'Team not found' };
  if (!team.is_active) return { error: `${team.name} is not active` };

  // Calculate team's remaining purse from confirmed purchases
  const { data: purchases } = await supabase
    .from('auction_purchases')
    .select('final_price')
    .eq('team_id', teamId)
    .eq('auction_id', auctionId)
    .eq('status', 'confirmed');

  const totalSpent = (purchases ?? []).reduce((sum, p) => sum + p.final_price, 0);
  const remainingPurse = team.initial_purse - totalSpent;

  if (amount > remainingPurse) {
    return { error: `${team.name} has insufficient funds. Remaining: ${remainingPurse}` };
  }

  // Check roster capacity
  const { count: rosterCount } = await supabase
    .from('team_roster')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('tournament_id', auction.tournament_id);

  if ((rosterCount ?? 0) + getCaptainSlot(team) >= team.max_roster_size) {
    return { error: `${team.name} has a full roster (including captain)` };
  }

  // Get auction player for bid history
  const { data: auctionPlayer } = await supabase
    .from('auction_players')
    .select('id')
    .eq('auction_id', auctionId)
    .eq('player_id', auction.current_player_id)
    .single();

  if (!auctionPlayer) return { error: 'Auction player not found' };

  // Get next sequence number
  const { count: bidCount } = await supabase
    .from('auction_bids')
    .select('*', { count: 'exact', head: true })
    .eq('auction_player_id', auctionPlayer.id);

  const updated = await updateAuctionCas(supabase, auctionId, stateVersion, {
    current_bid_amount: amount,
    current_bid_team_id: teamId,
  });
  if (!updated.ok) return { error: updated.error };

  // Record the bid after CAS succeeds
  await supabase.from('auction_bids').insert({
    auction_id: auctionId,
    auction_player_id: auctionPlayer.id,
    team_id: teamId,
    amount,
    sequence_number: (bidCount ?? 0) + 1,
    operator_id: user.id,
  });

  await recordAuctionEvent(supabase, {
    auction_id: auctionId,
    event_type: 'bid_placed',
    player_id: auction.current_player_id,
    team_id: teamId,
    actor_id: user.id,
    payload: {
      amount,
      team_name: team.name,
      previous_amount: auction.current_bid_amount,
      previous_team_id: auction.current_bid_team_id,
    },
  });

  return { success: true, ...toActionState(updated.auction) };
}

// ============================================================
// SELL PLAYER
// ============================================================

export async function sellPlayer(
  auctionId: string,
  stateVersion: number
): Promise<AuctionActionResult> {
  const user = await requireUser();
  const serviceClient = await createServiceClient();
  const supabase = await createClient();

  // Fetch auction
  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (error || !auction) return { error: 'Auction not found' };
  if (auction.state_version !== stateVersion) {
    return { error: 'Auction state has changed. Please refresh.' };
  }
  if (auction.status !== 'live') return { error: 'Auction is not live' };
  if (auction.current_phase !== 'bidding') return { error: 'Not in bidding phase' };
  if (!auction.current_player_id) return { error: 'No player being auctioned' };
  if (!auction.current_bid_team_id) return { error: 'No team has bid on this player' };
  if (!auction.current_bid_amount || auction.current_bid_amount <= 0) {
    return { error: 'No valid bid amount' };
  }

  const teamId = auction.current_bid_team_id;
  const finalPrice = auction.current_bid_amount;
  const playerId = auction.current_player_id;

  // Fetch team for validation
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (!team) return { error: 'Team not found' };

  // Validate team can afford this purchase (recalculate server-side)
  const { data: existingPurchases } = await supabase
    .from('auction_purchases')
    .select('final_price')
    .eq('team_id', teamId)
    .eq('auction_id', auctionId)
    .eq('status', 'confirmed');

  const totalSpent = (existingPurchases ?? []).reduce((sum, p) => sum + p.final_price, 0);
  const remainingPurse = team.initial_purse - totalSpent;

  if (finalPrice > remainingPurse) {
    return { error: `${team.name} cannot afford ${finalPrice}. Remaining: ${remainingPurse}` };
  }

  // Check roster capacity
  const { count: rosterCount } = await supabase
    .from('team_roster')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('tournament_id', auction.tournament_id);

  if ((rosterCount ?? 0) + getCaptainSlot(team) >= team.max_roster_size) {
    return { error: `${team.name} has a full roster (including captain)` };
  }

  // Get auction player
  const { data: auctionPlayer } = await supabase
    .from('auction_players')
    .select('id')
    .eq('auction_id', auctionId)
    .eq('player_id', playerId)
    .single();

  if (!auctionPlayer) return { error: 'Auction player not found' };

  // Perform the sale atomically using service client
  // 1. Create purchase record
  const { data: purchase, error: purchaseError } = await serviceClient
    .from('auction_purchases')
    .insert({
      auction_id: auctionId,
      auction_player_id: auctionPlayer.id,
      player_id: playerId,
      team_id: teamId,
      final_price: finalPrice,
      status: 'confirmed',
    })
    .select()
    .single();

  if (purchaseError) {
    if (purchaseError.code === '23505') {
      return { error: 'This player has already been sold in this auction' };
    }
    return { error: 'Failed to record purchase' };
  }

  // 2. Add to team roster
  const { error: rosterError } = await serviceClient
    .from('team_roster')
    .insert({
      tournament_id: auction.tournament_id,
      team_id: teamId,
      player_id: playerId,
      auction_id: auctionId,
      purchase_id: purchase.id,
      purchase_price: finalPrice,
    });

  if (rosterError) {
    // Rollback the purchase
    await serviceClient
      .from('auction_purchases')
      .delete()
      .eq('id', purchase.id);
    return { error: 'Failed to add player to roster' };
  }

  // 3. Update auction player status
  await serviceClient
    .from('auction_players')
    .update({
      status: 'sold',
      final_sale_price: finalPrice,
      winning_team_id: teamId,
    })
    .eq('id', auctionPlayer.id);

  // 4. Update player status
  await serviceClient
    .from('players')
    .update({ status: 'sold' })
    .eq('id', playerId);

  // 5. Update auction state
  const { data: updatedAuction, error: auctionUpdateError } = await serviceClient
    .from('auctions')
    .update({
      current_phase: 'sold',
      state_version: stateVersion + 1,
    })
    .eq('id', auctionId)
    .eq('state_version', stateVersion)
    .select('*')
    .maybeSingle();

  if (auctionUpdateError || !updatedAuction) {
    return { error: 'Sale recorded but auction state update failed. Refresh the page.' };
  }

  // 6. Record audit event
  await recordAuctionEvent(supabase, {
    auction_id: auctionId,
    event_type: 'player_sold',
    player_id: playerId,
    team_id: teamId,
    actor_id: user.id,
    payload: {
      final_price: finalPrice,
      team_name: team.name,
      purchase_id: purchase.id,
    },
  });

  return { success: true, ...toActionState(updatedAuction), purchaseId: purchase.id };
}

// ============================================================
// MARK PLAYER UNSOLD
// ============================================================

export async function markUnsold(
  auctionId: string,
  stateVersion: number
): Promise<AuctionActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (error || !auction) return { error: 'Auction not found' };
  if (auction.state_version !== stateVersion) {
    return { error: 'Auction state has changed. Please refresh.' };
  }
  if (auction.status !== 'live') return { error: 'Auction is not live' };
  if (!auction.current_player_id) return { error: 'No player being auctioned' };
  if (auction.current_phase !== 'bidding' && auction.current_phase !== 'player_intro') {
    return { error: 'Can only mark unsold during player intro or bidding' };
  }

  const playerId = auction.current_player_id;

  // Get auction player
  const { data: auctionPlayer } = await supabase
    .from('auction_players')
    .select('id')
    .eq('auction_id', auctionId)
    .eq('player_id', playerId)
    .single();

  if (!auctionPlayer) return { error: 'Auction player not found' };

  // Update auction player
  await supabase
    .from('auction_players')
    .update({ status: 'unsold' })
    .eq('id', auctionPlayer.id);

  // Update player status
  await supabase
    .from('players')
    .update({ status: 'unsold' })
    .eq('id', playerId);

  const updated = await updateAuctionCas(supabase, auctionId, stateVersion, {
    current_phase: 'unsold',
  });
  if (!updated.ok) return { error: updated.error };

  await recordAuctionEvent(supabase, {
    auction_id: auctionId,
    event_type: 'player_unsold',
    player_id: playerId,
    actor_id: user.id,
    payload: { base_price: auction.current_bid_amount },
  });

  return { success: true, ...toActionState(updated.auction) };
}

// ============================================================
// UNDO LAST SALE (compensating action)
// ============================================================

export async function undoLastSale(
  auctionId: string,
  purchaseId: string,
  stateVersion: number
): Promise<AuctionActionResult> {
  const user = await requireUser();
  const serviceClient = await createServiceClient();
  const supabase = await createClient();

  // Fetch the purchase
  const { data: purchase, error } = await supabase
    .from('auction_purchases')
    .select('*')
    .eq('id', purchaseId)
    .eq('auction_id', auctionId)
    .eq('status', 'confirmed')
    .single();

  if (error || !purchase) return { error: 'Purchase not found or already corrected' };

  // Fetch auction for version check
  const { data: auction } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (!auction) return { error: 'Auction not found' };
  if (auction.state_version !== stateVersion) {
    return { error: 'Auction state has changed. Please refresh.' };
  }

  // 1. Mark purchase as corrected (don't delete)
  await serviceClient
    .from('auction_purchases')
    .update({
      status: 'corrected',
      corrected_at: new Date().toISOString(),
    })
    .eq('id', purchaseId);

  // 2. Remove from roster
  await serviceClient
    .from('team_roster')
    .delete()
    .eq('purchase_id', purchaseId);

  // 3. Reset auction player status
  const { data: auctionPlayer } = await supabase
    .from('auction_players')
    .select('id')
    .eq('id', purchase.auction_player_id)
    .single();

  if (auctionPlayer) {
    await serviceClient
      .from('auction_players')
      .update({
        status: 'queued',
        final_sale_price: null,
        winning_team_id: null,
      })
      .eq('id', auctionPlayer.id);
  }

  // 4. Reset player status
  await serviceClient
    .from('players')
    .update({ status: 'registered' })
    .eq('id', purchase.player_id);

  // 5. Update auction state version
  const { data: updatedAuction, error: updateError } = await serviceClient
    .from('auctions')
    .update({
      state_version: stateVersion + 1,
      current_phase: 'standby',
      current_player_id: null,
      current_bid_amount: null,
      current_bid_team_id: null,
      status: auction.status === 'completed' ? 'live' : auction.status,
    })
    .eq('id', auctionId)
    .eq('state_version', stateVersion)
    .select('*')
    .maybeSingle();

  if (updateError || !updatedAuction) {
    return { error: 'Failed to undo sale — auction state changed. Refresh and try again.' };
  }

  // 6. Record compensating audit event
  await recordAuctionEvent(supabase, {
    auction_id: auctionId,
    event_type: 'sale_corrected',
    player_id: purchase.player_id,
    team_id: purchase.team_id,
    actor_id: user.id,
    payload: {
      purchase_id: purchaseId,
      original_price: purchase.final_price,
      reason: 'undo_sale',
    },
  });

  return { success: true, ...toActionState(updatedAuction) };
}

// ============================================================
// UNDO LAST BID (during active bidding)
// ============================================================

export async function undoLastBid(
  auctionId: string,
  stateVersion: number
): Promise<AuctionActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (error || !auction) return { error: 'Auction not found' };
  if (auction.state_version !== stateVersion) {
    return { error: 'Auction state has changed. Please refresh.' };
  }
  if (auction.status !== 'live') return { error: 'Auction is not live' };
  if (auction.current_phase !== 'bidding') return { error: 'Not in bidding phase' };
  if (!auction.current_player_id) return { error: 'No player being auctioned' };
  if (!auction.current_bid_team_id) {
    return { error: 'No team bid to undo yet' };
  }

  const { data: auctionPlayer } = await supabase
    .from('auction_players')
    .select('id, base_price')
    .eq('auction_id', auctionId)
    .eq('player_id', auction.current_player_id)
    .single();

  if (!auctionPlayer) return { error: 'Auction player not found' };

  const { data: recentBids } = await supabase
    .from('auction_bids')
    .select('*')
    .eq('auction_player_id', auctionPlayer.id)
    .order('sequence_number', { ascending: false })
    .limit(2);

  if (!recentBids || recentBids.length === 0) {
    return { error: 'No bids to undo' };
  }

  const lastBid = recentBids[0];
  const previousBid = recentBids[1] ?? null;

  await supabase.from('auction_bids').delete().eq('id', lastBid.id);

  const updated = await updateAuctionCas(supabase, auctionId, stateVersion, {
    current_bid_amount: previousBid?.amount ?? auctionPlayer.base_price,
    current_bid_team_id: previousBid?.team_id ?? null,
  });
  if (!updated.ok) return { error: updated.error };

  await recordAuctionEvent(supabase, {
    auction_id: auctionId,
    event_type: 'bid_corrected',
    player_id: auction.current_player_id,
    team_id: lastBid.team_id,
    actor_id: user.id,
    payload: {
      undone_amount: lastBid.amount,
      undone_team_id: lastBid.team_id,
      restored_amount: previousBid?.amount ?? auctionPlayer.base_price,
      restored_team_id: previousBid?.team_id ?? null,
    },
  });

  return { success: true, ...toActionState(updated.auction) };
}

// ============================================================
// HELPER: Record auction event
// ============================================================

async function recordAuctionEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  event: {
    auction_id: string;
    event_type: AuctionEventType;
    player_id?: string | null;
    team_id?: string | null;
    actor_id: string;
    payload: Record<string, unknown>;
  }
) {
  // Get next sequence number
  const { count } = await supabase
    .from('auction_events')
    .select('*', { count: 'exact', head: true })
    .eq('auction_id', event.auction_id);

  await supabase.from('auction_events').insert({
    auction_id: event.auction_id,
    sequence_number: (count ?? 0) + 1,
    event_type: event.event_type,
    player_id: event.player_id ?? null,
    team_id: event.team_id ?? null,
    actor_id: event.actor_id,
    payload: event.payload,
  });
}
