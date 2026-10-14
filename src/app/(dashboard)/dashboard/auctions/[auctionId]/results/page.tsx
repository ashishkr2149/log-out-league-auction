import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, getRoleLabel, getEffectiveRosterCount } from '@/lib/auction/validation';


interface Props {
  params: Promise<{ auctionId: string }>;
}

export default async function AuctionResultsPage({ params }: Props) {
  const { auctionId } = await params;
  const supabase = await createClient();

  const { data: auction } = await supabase
    .from('auctions')
    .select('*, tournament:tournaments(id, name)')
    .eq('id', auctionId)
    .single();

  if (!auction) notFound();

  // Fetch all auction players with details
  const { data: auctionPlayers } = await supabase
    .from('auction_players')
    .select(`
      *,
      player:players(*),
      winning_team:teams(*)
    `)
    .eq('auction_id', auctionId)
    .order('auction_order');

  // Fetch teams with stats
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', auction.tournament_id)
    .order('name');

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

  const soldPlayers = (auctionPlayers ?? []).filter((ap) => ap.status === 'sold');
  const unsoldPlayers = (auctionPlayers ?? []).filter((ap) => ap.status === 'unsold');
  const totalSpending = soldPlayers.reduce((sum, ap) => sum + (ap.final_sale_price ?? 0), 0);
  const highestPrice = soldPlayers.reduce((max, ap) => Math.max(max, ap.final_sale_price ?? 0), 0);

  const tournament = auction.tournament as unknown as { id: string; name: string };
  const currency = auction.currency_code || 'PTS';
  const money = (amount: number) => formatCurrency(amount, currency);

  const summaryStats = [
    {
      shortLabel: 'Players',
      label: 'Total Players',
      value: String(auctionPlayers?.length ?? 0),
      color: 'text-white',
    },
    {
      shortLabel: 'Sold',
      label: 'Players Sold',
      value: String(soldPlayers.length),
      color: 'text-green-400',
    },
    {
      shortLabel: 'Spent',
      label: 'Total Spending',
      value: money(totalSpending),
      color: 'text-white',
    },
    {
      shortLabel: 'Top',
      label: 'Highest Price',
      value: money(highestPrice),
      color: 'text-yellow-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Link href={`/dashboard/auctions/${auctionId}/control`}>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Auction Results</h1>
          <p className="mt-1 text-slate-400 truncate">
            {auction.name}
            {tournament?.name ? ` · ${tournament.name}` : ''}
          </p>
        </div>
      </div>

      {/* Summary Stats — 4-up on all viewports */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="border-slate-800 bg-slate-900/80">
            <CardContent className="px-1.5 py-3 sm:p-4 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                <span className="sm:hidden">{stat.shortLabel}</span>
                <span className="hidden sm:inline">{stat.label}</span>
              </p>
              <p className={`mt-1 text-sm sm:text-xl font-bold leading-tight ${stat.color}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Summary */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-white">Team Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:hidden divide-y divide-slate-800">
            {teamStats.map((team) => {
              const effective = getEffectiveRosterCount(team);
              return (
                <div key={team.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
                    >
                      {team.short_name.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{team.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {team.captain_name ? `C: ${team.captain_name}` : 'No captain'}
                      </p>
                    </div>
                    <p className="ml-auto text-sm font-bold text-green-400 shrink-0">
                      {money(team.remaining_purse)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pl-11">
                    <div>
                      <p className="text-slate-500">Spent</p>
                      <p className="text-red-400 font-medium">{money(team.spent)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Roster</p>
                      <p className="text-white font-medium">
                        {effective}/{team.max_roster_size}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Left</p>
                      <p className="text-slate-300 font-medium">
                        {Math.max(0, team.max_roster_size - effective)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Team</TableHead>
                  <TableHead className="text-slate-400">Captain</TableHead>
                  <TableHead className="text-slate-400">Initial Purse</TableHead>
                  <TableHead className="text-slate-400">Spent</TableHead>
                  <TableHead className="text-slate-400">Remaining</TableHead>
                  <TableHead className="text-slate-400">Players</TableHead>
                  <TableHead className="text-slate-400">Slots Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamStats.map((team) => (
                  <TableRow key={team.id} className="border-slate-800">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: team.primary_color,
                            color: team.secondary_color,
                          }}
                        >
                          {team.short_name.slice(0, 2)}
                        </div>
                        <span className="text-white font-medium">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">{team.captain_name ?? '—'}</TableCell>
                    <TableCell className="text-white">{money(team.initial_purse)}</TableCell>
                    <TableCell className="text-red-400">{money(team.spent)}</TableCell>
                    <TableCell className="text-green-400 font-bold">
                      {money(team.remaining_purse)}
                    </TableCell>
                    <TableCell className="text-white">
                      {getEffectiveRosterCount(team)}
                      <span className="text-slate-500 text-xs ml-1">
                        ({team.roster_count} bought{team.captain_name ? ' + C' : ''})
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {Math.max(0, team.max_roster_size - getEffectiveRosterCount(team))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sold Players */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-white">Sold Players ({soldPlayers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:hidden divide-y divide-slate-800">
            {soldPlayers.map((ap, i) => (
              <div key={ap.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    <span className="text-slate-500 text-xs mr-2">{i + 1}</span>
                    {ap.player?.display_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {getRoleLabel(ap.player?.role ?? 'other')}
                    {' · '}
                    <span
                      style={{
                        color: (ap.winning_team as unknown as { primary_color: string })
                          ?.primary_color,
                      }}
                    >
                      {(ap.winning_team as unknown as { name: string })?.name ?? '-'}
                    </span>
                  </p>
                </div>
                <span className="text-green-400 font-bold font-mono text-sm shrink-0">
                  {money(ap.final_sale_price ?? 0)}
                </span>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">#</TableHead>
                  <TableHead className="text-slate-400">Player</TableHead>
                  <TableHead className="text-slate-400">Role</TableHead>
                  <TableHead className="text-slate-400">Base Price</TableHead>
                  <TableHead className="text-slate-400">Sale Price</TableHead>
                  <TableHead className="text-slate-400">Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldPlayers.map((ap, i) => (
                  <TableRow key={ap.id} className="border-slate-800">
                    <TableCell className="text-slate-500">{i + 1}</TableCell>
                    <TableCell className="text-white font-medium">
                      {ap.player?.display_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {getRoleLabel(ap.player?.role ?? 'other')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 font-mono text-sm">
                      {money(ap.base_price)}
                    </TableCell>
                    <TableCell className="text-green-400 font-bold font-mono">
                      {money(ap.final_sale_price ?? 0)}
                    </TableCell>
                    <TableCell>
                      <span
                        className="font-medium"
                        style={{
                          color: (ap.winning_team as unknown as { primary_color: string })
                            ?.primary_color,
                        }}
                      >
                        {(ap.winning_team as unknown as { name: string })?.name ?? '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Unsold Players */}
      {unsoldPlayers.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-white">Unsold Players ({unsoldPlayers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Player</TableHead>
                  <TableHead className="text-slate-400">Role</TableHead>
                  <TableHead className="text-slate-400">Base Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unsoldPlayers.map((ap) => (
                  <TableRow key={ap.id} className="border-slate-800">
                    <TableCell className="text-white">{ap.player?.display_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {getRoleLabel(ap.player?.role ?? 'other')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 font-mono text-sm">
                      {money(ap.base_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
