import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Trophy } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, getRoleLabel } from '@/lib/auction/validation';


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
  const avgPrice = soldPlayers.length > 0 ? Math.round(totalSpending / soldPlayers.length) : 0;
  const highestPrice = soldPlayers.reduce((max, ap) => Math.max(max, ap.final_sale_price ?? 0), 0);

  const tournament = auction.tournament as unknown as { id: string; name: string };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/auctions/${auctionId}/control`}>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Auction Results</h1>
            <p className="mt-1 text-slate-400">{auction.name} — {tournament?.name}</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">Total Players</p>
            <p className="text-2xl font-bold text-white">{auctionPlayers?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">Players Sold</p>
            <p className="text-2xl font-bold text-green-400">{soldPlayers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">Total Spending</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalSpending)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">Highest Price</p>
            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(highestPrice)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Summary */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-white">Team Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Team</TableHead>
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
                        style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
                      >
                        {team.short_name.slice(0, 2)}
                      </div>
                      <span className="text-white font-medium">{team.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">{formatCurrency(team.initial_purse)}</TableCell>
                  <TableCell className="text-red-400">{formatCurrency(team.spent)}</TableCell>
                  <TableCell className="text-green-400 font-bold">{formatCurrency(team.remaining_purse)}</TableCell>
                  <TableCell className="text-white">{team.roster_count}</TableCell>
                  <TableCell className="text-slate-400">{team.max_roster_size - team.roster_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sold Players */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-white">Sold Players ({soldPlayers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                  <TableCell className="text-white font-medium">{ap.player?.display_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {getRoleLabel(ap.player?.role ?? 'other')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 font-mono text-sm">
                    {formatCurrency(ap.base_price)}
                  </TableCell>
                  <TableCell className="text-green-400 font-bold font-mono">
                    {formatCurrency(ap.final_sale_price ?? 0)}
                  </TableCell>
                  <TableCell>
                    <span
                      className="font-medium"
                      style={{ color: (ap.winning_team as unknown as { primary_color: string })?.primary_color }}
                    >
                      {(ap.winning_team as unknown as { name: string })?.name ?? '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                      {formatCurrency(ap.base_price)}
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
