import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { CreatePlayerDialog } from './create-player-dialog';
import { ImportPlayersDialog } from './import-players-dialog';
import { PlayersTable } from './players-table';

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/tournaments/${tournamentId}`}>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Players</h1>
            <p className="mt-1 text-slate-400">
              {tournament.name} — {players?.length ?? 0} players · click a row to edit
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
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
            <PlayersTable tournamentId={tournamentId} players={players} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
