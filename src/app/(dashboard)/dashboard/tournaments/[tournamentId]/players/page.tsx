import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, getRoleLabel, getPlayerStatusLabel } from '@/lib/auction/validation';
import { CreatePlayerDialog } from './create-player-dialog';
import { ImportPlayersDialog } from './import-players-dialog';


interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function PlayersPage({ params }: Props) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) notFound();

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('auction_order', { ascending: true, nullsFirst: false })
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/tournaments/${tournamentId}`}>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Players</h1>
            <p className="mt-1 text-slate-400">{tournament.name} — {players?.length ?? 0} players</p>
          </div>
        </div>
        <div className="flex gap-3">
          <ImportPlayersDialog tournamentId={tournamentId} />
          <CreatePlayerDialog tournamentId={tournamentId} />
        </div>
      </div>

      {!players || players.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-medium text-slate-300">No players yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md text-center">
              Add players individually or import them from a CSV file
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">#</TableHead>
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Role</TableHead>
                  <TableHead className="text-slate-400">Base Price</TableHead>
                  <TableHead className="text-slate-400">Category</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, i) => (
                  <TableRow key={player.id} className="border-slate-800">
                    <TableCell className="text-slate-500">
                      {player.auction_order ?? i + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-white">{player.name}</span>
                        {player.jersey_number && (
                          <span className="ml-2 text-xs text-slate-500">#{player.jersey_number}</span>
                        )}
                      </div>
                      {player.display_name !== player.name && (
                        <span className="text-xs text-slate-500">{player.display_name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {getRoleLabel(player.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-mono text-sm">
                      {formatCurrency(player.base_price)}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {player.category ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          player.status === 'sold'
                            ? 'border-green-600 text-green-400'
                            : player.status === 'unsold'
                              ? 'border-red-600 text-red-400'
                              : player.status === 'in_auction'
                                ? 'border-yellow-600 text-yellow-400'
                                : 'border-slate-600 text-slate-400'
                        }
                      >
                        {getPlayerStatusLabel(player.status)}
                      </Badge>
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
