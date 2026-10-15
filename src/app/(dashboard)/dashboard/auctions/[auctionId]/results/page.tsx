import { createClient } from '@/lib/supabase/server';
import { canSeeTournamentPurse } from '@/lib/auth/permissions';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, getRoleLabel, getEffectiveRosterCount } from '@/lib/auction/validation';
import { BackLink } from '@/components/shell/back-link';


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

  const showPurse = await canSeeTournamentPurse(auction.tournament_id);

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
      color: 'text-foreground',
    },
    {
      shortLabel: 'Sold',
      label: 'Players Sold',
      value: String(soldPlayers.length),
      color: 'text-emerald-600',
    },
    {
      shortLabel: 'Spent',
      label: 'Total Spending',
      value: money(totalSpending),
      color: 'text-foreground',
    },
    {
      shortLabel: 'Top',
      label: 'Highest Price',
      value: money(highestPrice),
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <BackLink fallbackHref={`/dashboard/auctions/${auctionId}/control`} />
        <div className="min-w-0">
          <h1 className="page-title">Auction Results</h1>
          <p className="mt-1 text-muted-foreground truncate">
            {auction.name}
            {tournament?.name ? ` · ${tournament.name}` : ''}
          </p>
        </div>
      </div>

      {/* Summary Stats — 4-up on all viewports */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="px-1.5 py-3 sm:p-4 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
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
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Team Summary</CardTitle>
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
                      <p className="font-medium text-foreground truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {team.captain_name ? `C: ${team.captain_name}` : 'No captain'}
                      </p>
                    </div>
                    {showPurse ? (
                      <p className="ml-auto text-sm font-bold text-emerald-600 shrink-0">
                        {money(team.remaining_purse)}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pl-11">
                    <div>
                      <p className="text-muted-foreground">Spent</p>
                      <p className="text-primary font-medium">
                        {showPurse ? money(team.spent) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Roster</p>
                      <p className="text-foreground font-medium">
                        {effective}/{team.max_roster_size}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Left</p>
                      <p className="text-muted-foreground font-medium">
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
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Team</TableHead>
                  <TableHead className="text-muted-foreground">Captain</TableHead>
                  {showPurse && (
                    <>
                      <TableHead className="text-muted-foreground">Initial Purse</TableHead>
                      <TableHead className="text-muted-foreground">Spent</TableHead>
                      <TableHead className="text-muted-foreground">Remaining</TableHead>
                    </>
                  )}
                  <TableHead className="text-muted-foreground">Players</TableHead>
                  <TableHead className="text-muted-foreground">Slots Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamStats.map((team) => (
                  <TableRow key={team.id} className="border-border">
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
                        <span className="text-foreground font-medium">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{team.captain_name ?? '—'}</TableCell>
                    {showPurse && (
                      <>
                        <TableCell className="text-foreground">{money(team.initial_purse)}</TableCell>
                        <TableCell className="text-primary">{money(team.spent)}</TableCell>
                        <TableCell className="text-emerald-600 font-bold">
                          {money(team.remaining_purse)}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-foreground">
                      {getEffectiveRosterCount(team)}
                      <span className="text-muted-foreground text-xs ml-1">
                        ({team.roster_count} bought{team.captain_name ? ' + C' : ''})
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
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
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Sold Players ({soldPlayers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:hidden divide-y divide-slate-800">
            {soldPlayers.map((ap, i) => (
              <div key={ap.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-foreground font-medium truncate">
                    <span className="text-muted-foreground text-xs mr-2">{i + 1}</span>
                    {ap.player?.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
                <span className="text-emerald-600 font-bold font-mono text-sm shrink-0">
                  {money(ap.final_sale_price ?? 0)}
                </span>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">#</TableHead>
                  <TableHead className="text-muted-foreground">Player</TableHead>
                  <TableHead className="text-muted-foreground">Role</TableHead>
                  <TableHead className="text-muted-foreground">Base Price</TableHead>
                  <TableHead className="text-muted-foreground">Sale Price</TableHead>
                  <TableHead className="text-muted-foreground">Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldPlayers.map((ap, i) => (
                  <TableRow key={ap.id} className="border-border">
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-foreground font-medium">
                      {ap.player?.display_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {getRoleLabel(ap.player?.role ?? 'other')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {money(ap.base_price)}
                    </TableCell>
                    <TableCell className="text-emerald-600 font-bold font-mono">
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
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Unsold Players ({unsoldPlayers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Player</TableHead>
                  <TableHead className="text-muted-foreground">Role</TableHead>
                  <TableHead className="text-muted-foreground">Base Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unsoldPlayers.map((ap) => (
                  <TableRow key={ap.id} className="border-border">
                    <TableCell className="text-foreground">{ap.player?.display_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {getRoleLabel(ap.player?.role ?? 'other')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
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
