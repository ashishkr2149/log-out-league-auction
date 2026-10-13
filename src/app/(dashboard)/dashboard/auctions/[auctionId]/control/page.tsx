import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { AuctionControlPanel } from '@/components/auction/auction-control-panel';


interface Props {
  params: Promise<{ auctionId: string }>;
}

export default async function AuctionControlPage({ params }: Props) {
  const { auctionId } = await params;
  const supabase = await createClient();

  // Fetch auction with tournament info
  const { data: auction, error } = await supabase
    .from('auctions')
    .select(`
      *,
      tournament:tournaments(id, name, primary_color, secondary_color)
    `)
    .eq('id', auctionId)
    .single();

  if (error || !auction) notFound();

  // Fetch all teams for this tournament
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', auction.tournament_id)
    .eq('is_active', true)
    .order('name');

  // Fetch all auction players with player details
  const { data: auctionPlayers } = await supabase
    .from('auction_players')
    .select(`
      *,
      player:players(*)
    `)
    .eq('auction_id', auctionId)
    .order('auction_order');

  // Fetch current player details if set
  let currentPlayerDetails = null;
  if (auction.current_player_id) {
    const { data: cp } = await supabase
      .from('players')
      .select('*')
      .eq('id', auction.current_player_id)
      .single();
    currentPlayerDetails = cp;
  }

  // Fetch current bidding team details if set
  let currentTeamDetails = null;
  if (auction.current_bid_team_id) {
    const { data: ct } = await supabase
      .from('teams')
      .select('*')
      .eq('id', auction.current_bid_team_id)
      .single();
    currentTeamDetails = ct;
  }

  // Fetch team stats (spending and roster counts)
  const teamStats = await Promise.all(
    (teams ?? []).map(async (team) => {
      const { data: purchases } = await supabase
        .from('auction_purchases')
        .select('final_price')
        .eq('team_id', team.id)
        .eq('auction_id', auctionId)
        .eq('status', 'confirmed');

      const { count: rosterCount } = await supabase
        .from('team_roster')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('tournament_id', auction.tournament_id);

      const spent = (purchases ?? []).reduce((sum, p) => sum + p.final_price, 0);

      return {
        ...team,
        spent,
        remaining_purse: team.initial_purse - spent,
        roster_count: rosterCount ?? 0,
      };
    })
  );

  // Fetch recent events
  const { data: recentEvents } = await supabase
    .from('auction_events')
    .select('*')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch last purchase for undo
  const { data: lastPurchase } = await supabase
    .from('auction_purchases')
    .select('*')
    .eq('auction_id', auctionId)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return (
    <AuctionControlPanel
      auction={auction}
      teams={teamStats}
      auctionPlayers={auctionPlayers ?? []}
      currentPlayer={currentPlayerDetails}
      currentTeam={currentTeamDetails}
      recentEvents={recentEvents ?? []}
      lastPurchase={lastPurchase}
    />
  );
}
