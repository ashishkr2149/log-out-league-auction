'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/permissions';
import { auctionSchema, AuctionFormData } from '@/lib/validation/schemas';
import { revalidatePath } from 'next/cache';

export async function createAuction(tournamentId: string, data: AuctionFormData) {
  const user = await requireUser();
  const validated = auctionSchema.parse(data);
  const supabase = await createClient();

  // Create the auction
  const { data: auction, error } = await supabase
    .from('auctions')
    .insert({
      ...validated,
      tournament_id: tournamentId,
      created_by: user.id,
      status: 'draft',
      current_phase: 'standby',
      state_version: 0,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Auto-assign creator as operator
  await supabase.from('auction_operator_assignments').insert({
    auction_id: auction.id,
    user_id: user.id,
  });

  // Create default overlay config
  await supabase.from('overlay_configs').insert({
    auction_id: auction.id,
    layout: 'side-panel',
    theme: 'dark',
    is_active: true,
  });

  // Add all tournament players to the auction
  const { data: players } = await supabase
    .from('players')
    .select('id, base_price, auction_order')
    .eq('tournament_id', tournamentId)
    .in('status', ['registered', 'queued'])
    .order('auction_order', { ascending: true, nullsFirst: false })
    .order('name');

  if (players && players.length > 0) {
    const auctionPlayers = players.map((p, i) => ({
      auction_id: auction.id,
      player_id: p.id,
      auction_order: p.auction_order ?? i + 1,
      base_price: p.base_price,
      status: 'queued',
    }));

    await supabase.from('auction_players').insert(auctionPlayers);
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  return { success: true, auctionId: auction.id };
}

export async function updateAuctionSettings(
  auctionId: string,
  data: Partial<AuctionFormData>
) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('auctions')
    .update(data)
    .eq('id', auctionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/auctions/${auctionId}/settings`);
  return { success: true };
}

export async function generateOverlayCredentialAction(
  auctionId: string,
  label: string = 'OBS Browser Source'
) {
  await requireUser();

  try {
    const { createOverlayCredential } = await import('@/lib/overlay/credentials');
    const credential = await createOverlayCredential(auctionId, label);

    revalidatePath(`/dashboard/auctions/${auctionId}/settings`);
    revalidatePath(`/dashboard/auctions/${auctionId}/overlay-preview`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return {
      success: true,
      token: credential.token,
      overlayUrl: `${appUrl}/overlay/${credential.token}`,
      label: credential.label,
      id: credential.id,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to generate overlay credential',
    };
  }
}
