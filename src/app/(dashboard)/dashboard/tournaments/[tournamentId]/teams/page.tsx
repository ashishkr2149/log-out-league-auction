import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/auction/validation';
import { CreateTeamDialog } from './create-team-dialog';


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

  // For each team, get purchase totals and roster counts
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/tournaments/${tournamentId}`}>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Teams</h1>
            <p className="mt-1 text-slate-400">{tournament.name}</p>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamsWithStats.map((team) => (
            <Card key={team.id} className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
                      style={{
                        backgroundColor: team.primary_color,
                        color: team.secondary_color,
                      }}
                    >
                      {team.short_name.slice(0, 3)}
                    </div>
                    <div>
                      <CardTitle className="text-white text-base">{team.name}</CardTitle>
                      <CardDescription className="text-slate-400">{team.short_name}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={team.is_active ? 'border-green-600 text-green-400' : 'border-red-600 text-red-400'}
                  >
                    {team.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Initial Purse</span>
                    <span className="font-medium text-white">{formatCurrency(team.initial_purse)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Spent</span>
                    <span className="font-medium text-red-400">{formatCurrency(team.spent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Remaining</span>
                    <span className="font-medium text-green-400">{formatCurrency(team.remaining_purse)}</span>
                  </div>
                  <div className="h-px bg-slate-800" />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Roster</span>
                    <span className="font-medium text-white">
                      {team.roster_count} / {team.max_roster_size}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
