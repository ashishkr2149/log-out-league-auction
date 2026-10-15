import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { CreatePlayerDialog } from './create-player-dialog';
import { ImportPlayersDialog } from './import-players-dialog';
import { PlayersTable } from './players-table';
import { BackLink } from '@/components/shell/back-link';

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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <BackLink fallbackHref={`/dashboard/tournaments/${tournamentId}`} />
          <div className="min-w-0">
            <h1 className="page-title">Players</h1>
            <p className="mt-1 text-muted-foreground truncate">
              {tournament.name}
              <span className="text-muted-foreground"> · {players?.length ?? 0}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ImportPlayersDialog tournamentId={tournamentId} />
          <CreatePlayerDialog tournamentId={tournamentId} />
        </div>
      </div>

      {!players || players.length === 0 ? (
        <div className="panel flex flex-col items-center px-4 py-12 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="section-title text-muted-foreground">No players yet</h3>
          <p className="caption mt-2 max-w-sm">
            Add one player or import a CSV.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <ImportPlayersDialog tournamentId={tournamentId} />
            <CreatePlayerDialog tournamentId={tournamentId} />
          </div>
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <PlayersTable tournamentId={tournamentId} players={players} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
