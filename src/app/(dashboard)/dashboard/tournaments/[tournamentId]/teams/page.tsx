import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { CreateTeamDialog } from './create-team-dialog';
import { TeamCards } from './team-cards';

interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TeamsPage({ params }: Props) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) notFound();

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
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

      return {
        ...team,
        spent,
        remaining_purse: team.initial_purse - spent,
        roster_count: rosterCount ?? 0,
      };
    })
  );

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
            <h1 className="text-3xl font-bold text-white">Teams</h1>
            <p className="mt-1 text-slate-400">
              {tournament.name} — click a card for squad details
            </p>
          </div>
        </div>
        <CreateTeamDialog tournamentId={tournamentId} />
      </div>

      {teamsWithStats.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-medium text-slate-300">No teams yet</h3>
            <p className="mt-2 text-sm text-slate-500">Add teams to participate in the auction</p>
          </CardContent>
        </Card>
      ) : (
        <TeamCards tournamentId={tournamentId} teams={teamsWithStats} />
      )}
    </div>
  );
}
