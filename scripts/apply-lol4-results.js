/**
 * Reset LOG OUT LEAGUE 4.0 Main Auction and apply final results from the tracker sheet.
 * Usage: node -r dotenv/config scripts/apply-lol4-results.js dotenv_config_path=.env.local
 */
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Final auction results from Auction Tracker sheet */
const RESULTS = [
  { name: 'Ashish', team: 'Team C', price: 21 },
  { name: 'Prashant', team: 'Team C', price: 20 },
  { name: 'Joy', team: 'Team A', price: 18 },
  { name: 'Prabhakar', team: 'Team C', price: 35 },
  { name: 'Abhishek', team: 'Team B', price: 73 },
  { name: 'Cook Bhaiya', team: 'Team B', price: 1 },
  { name: 'Rishabh', team: 'Team A', price: 1 },
  { name: 'Nilesh Kumar', team: 'Team A', price: 14 },
  { name: 'Aniket', team: 'Team A', price: 20 },
  { name: 'Nilesh Singh', team: 'Team A', price: 30 },
  { name: 'Rajan', team: 'Team B', price: 1 },
  { name: 'Shorya', team: 'Team B', price: 6 },
  { name: 'Shubhendu', team: 'Team C', price: 2 },
  { name: 'Bharat', team: 'Team C', price: 5 },
  { name: 'Satyam', team: 'Team B', price: 18 },
];

(async () => {
  const { data: auction, error: aErr } = await sb
    .from('auctions')
    .select('id, tournament_id, name, state_version')
    .eq('name', 'LOG OUT LEAGUE 4.0 Main Auction')
    .single();
  if (aErr || !auction) throw aErr || new Error('Auction not found');
  console.log('Auction', auction.id);

  const { data: teams, error: tErr } = await sb
    .from('teams')
    .select('id, name')
    .eq('tournament_id', auction.tournament_id);
  if (tErr) throw tErr;
  const teamByName = Object.fromEntries(teams.map((t) => [t.name, t.id]));

  const { data: auctionPlayers, error: apErr } = await sb
    .from('auction_players')
    .select('id, player_id, player:players(id, name)')
    .eq('auction_id', auction.id);
  if (apErr) throw apErr;

  const apByName = Object.fromEntries(
    auctionPlayers.map((ap) => [ap.player.name, ap])
  );

  // Validate all result names exist
  for (const r of RESULTS) {
    if (!apByName[r.name]) throw new Error(`Player missing in auction: ${r.name}`);
    if (!teamByName[r.team]) throw new Error(`Team missing: ${r.team}`);
  }

  // 1) Clear existing sale artifacts for this auction
  const { data: purchases } = await sb
    .from('auction_purchases')
    .select('id')
    .eq('auction_id', auction.id);

  const purchaseIds = (purchases ?? []).map((p) => p.id);
  if (purchaseIds.length) {
    await sb.from('team_roster').delete().in('purchase_id', purchaseIds);
    await sb.from('auction_purchases').delete().eq('auction_id', auction.id);
  }
  await sb.from('auction_bids').delete().eq('auction_id', auction.id);

  // 2) Reset all auction players + players to queued/registered
  for (const ap of auctionPlayers) {
    await sb
      .from('auction_players')
      .update({
        status: 'queued',
        final_sale_price: null,
        winning_team_id: null,
      })
      .eq('id', ap.id);
    await sb.from('players').update({ status: 'registered' }).eq('id', ap.player_id);
  }

  // 3) Apply final sales in sheet order
  for (const [index, result] of RESULTS.entries()) {
    const ap = apByName[result.name];
    const teamId = teamByName[result.team];

    const { data: purchase, error: pErr } = await sb
      .from('auction_purchases')
      .insert({
        auction_id: auction.id,
        auction_player_id: ap.id,
        player_id: ap.player_id,
        team_id: teamId,
        final_price: result.price,
        status: 'confirmed',
      })
      .select()
      .single();
    if (pErr) throw pErr;

    const { error: rErr } = await sb.from('team_roster').insert({
      tournament_id: auction.tournament_id,
      team_id: teamId,
      player_id: ap.player_id,
      auction_id: auction.id,
      purchase_id: purchase.id,
      purchase_price: result.price,
    });
    if (rErr) throw rErr;

    await sb
      .from('auction_players')
      .update({
        status: 'sold',
        final_sale_price: result.price,
        winning_team_id: teamId,
        auction_order: index + 1,
      })
      .eq('id', ap.id);

    await sb.from('players').update({ status: 'sold' }).eq('id', ap.player_id);

    console.log(`Sold ${result.name} → ${result.team} @ ${result.price}`);
  }

  // 4) Mark auction completed / standby clear
  const { error: uErr } = await sb
    .from('auctions')
    .update({
      status: 'completed',
      current_phase: 'completed',
      current_player_id: null,
      current_bid_amount: null,
      current_bid_team_id: null,
      state_version: (auction.state_version ?? 0) + 1,
      completed_at: new Date().toISOString(),
    })
    .eq('id', auction.id);
  if (uErr) throw uErr;

  // Summary spend checks
  for (const teamName of ['Team A', 'Team B', 'Team C']) {
    const teamId = teamByName[teamName];
    const spent = RESULTS.filter((r) => r.team === teamName).reduce((s, r) => s + r.price, 0);
    const count = RESULTS.filter((r) => r.team === teamName).length;
    console.log(`${teamName}: ${count} players, spent ${spent}`);
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        auctionId: auction.id,
        resultsUrl: `https://log-out-league-auction.vercel.app/dashboard/auctions/${auction.id}/results`,
        controlUrl: `https://log-out-league-auction.vercel.app/dashboard/auctions/${auction.id}/control`,
      },
      null,
      2
    )
  );
})().catch((err) => {
  console.error('FAILED', err);
  process.exit(1);
});
