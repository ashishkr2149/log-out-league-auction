import { createClient } from '@/lib/supabase/server';
import { canSeeTournamentPurse } from '@/lib/auth/permissions';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { AddTeamPanel } from '@/components/tournament/add-team-panel';
import { TeamCards } from './team-cards';
import { BackLink } from '@/components/shell/back-link';

interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TeamsPage({ params }: Props) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const [{ data: tournament }, showPurse] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
    canSeeTournamentPurse(tournamentId),
  ]);

  if (!tournament) notFound();

  const { data: teams } = await supabase
    .from('teams')
    .select('*, global_teams(qr_slug, name)')
    .eq('tournament_id', tournamentId)
    .order('name');

  const teamsWithStats = await Promise.all(
    (teams ?? []).map(async (team) => {
      const { data: purchases } = await supabase
        .from('auction_purchases')
        .select('final_price')
        .eq('team_id', team.id)
        .eq('status', 'confirmed');

      const { count: rosterCount } = await supabase
        .from('team_roster')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('tournament_id', tournamentId);

      const spent = (purchases ?? []).reduce((sum, p) => sum + p.final_price, 0);
      const g = team.global_teams as
        | { qr_slug: string; name: string }
        | { qr_slug: string; name: string }[]
        | null;
      const global = Array.isArray(g) ? g[0] : g;

      return {
        ...team,
        spent,
        remaining_purse: team.initial_purse - spent,
        roster_count: rosterCount ?? 0,
        qr_slug: global?.qr_slug ?? null,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <BackLink fallbackHref={`/dashboard/tournaments/${tournamentId}`} />
          <div className="min-w-0">
            <h1 className="page-title">Teams</h1>
            <p className="mt-1 text-muted-foreground truncate">{tournament.name}</p>
          </div>
        </div>
        <AddTeamPanel tournamentId={tournamentId} />
      </div>

      <p className="text-sm text-muted-foreground">
        Teams are global franchises. Entries here are this tournament&apos;s auction side — only
        players on this tournament&apos;s list can play; auction sales also join the global squad.
      </p>

      {teamsWithStats.length === 0 ? (
        <div className="panel flex flex-col items-center px-4 py-12 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="section-title text-muted-foreground">No teams yet</h3>
          <p className="caption mt-2 max-w-sm">
            Create one, pick from My teams, or invite a captain.
          </p>
          <div className="mt-4">
            <AddTeamPanel tournamentId={tournamentId} />
          </div>
        </div>
      ) : (
        <TeamCards
          tournamentId={tournamentId}
          teams={teamsWithStats}
          showPurse={showPurse}
        />
      )}
    </div>
  );
}
