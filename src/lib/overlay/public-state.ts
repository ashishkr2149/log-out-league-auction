import { createServiceClient } from '@/lib/supabase/server';
import { OverlayPublicState } from '@/types/database';

/**
 * Fetch the public overlay state for a given auction.
 * Only returns information safe to display on a broadcast overlay.
 * No admin data, no private notes, no operator identities.
 */
export async function getOverlayPublicState(
  auctionId: string
): Promise<OverlayPublicState | null> {
  const supabase = await createServiceClient();

  // Fetch auction with current player and team info
  const { data: auction, error } = await supabase
    .from('auctions')
    .select(`
      id,
      name,
      current_player_id,
      current_bid_amount,
      current_bid_team_id,
      current_phase,
      state_version,
      currency_code,
      updated_at,
      tournament:tournaments(name, logo_path)
    `)
    .eq('id', auctionId)
    .single();

  if (error || !auction) return null;

  let currentPlayer: OverlayPublicState['current_player'] = null;
  let currentTeam: OverlayPublicState['current_team'] = null;
  let finalPrice: number | null = null;

  // Fetch current player details (only public info)
  if (auction.current_player_id) {
    const { data: player } = await supabase
      .from('players')
      .select('name, display_name, jersey_number, photo_path, role, base_price')
      .eq('id', auction.current_player_id)
      .single();

    if (player) {
      currentPlayer = {
        name: player.name,
        display_name: player.display_name,
        jersey_number: player.jersey_number,
        photo_url: player.photo_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/player-photos/${player.photo_path}`
          : null,
        role: player.role,
        base_price: player.base_price,
      };
    }

    // Fetch sale price if sold
    if (auction.current_phase === 'sold') {
      const { data: auctionPlayer } = await supabase
        .from('auction_players')
        .select('final_sale_price')
        .eq('auction_id', auctionId)
        .eq('player_id', auction.current_player_id)
        .single();

      finalPrice = auctionPlayer?.final_sale_price ?? auction.current_bid_amount;
    }
  }

  // Fetch current bidding team (only public info)
  if (auction.current_bid_team_id) {
    const { data: team } = await supabase
      .from('teams')
      .select('name, short_name, captain_name, logo_path, primary_color, secondary_color')
      .eq('id', auction.current_bid_team_id)
      .single();

    if (team) {
      currentTeam = {
        name: team.name,
        short_name: team.short_name,
        captain_name: team.captain_name,
        logo_url: team.logo_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/team-logos/${team.logo_path}`
          : null,
        primary_color: team.primary_color,
        secondary_color: team.secondary_color,
      };
    }
  }

  const tournament = auction.tournament as unknown as { name: string; logo_path: string | null };

  return {
    auction_id: auction.id,
    auction_name: auction.name,
    tournament_name: tournament?.name ?? '',
    tournament_logo: tournament?.logo_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tournament-assets/${tournament.logo_path}`
      : null,
    phase: auction.current_phase,
    current_player: currentPlayer,
    current_bid: auction.current_bid_amount,
    current_team: currentTeam,
    final_price: finalPrice ?? auction.current_bid_amount,
    currency_code: auction.currency_code,
    state_version: auction.state_version,
    updated_at: auction.updated_at,
  };
}
