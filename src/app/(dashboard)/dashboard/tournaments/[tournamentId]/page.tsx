import { createClient } from '@/lib/supabase/server';
import { getUserTournamentRole, ORGANIZER_ROLES } from '@/lib/auth/permissions';
import { listTournamentStaff } from '@/app/(dashboard)/dashboard/tournaments/actions';
import { TournamentHub } from '@/components/tournament/tournament-hub';
import { notFound } from 'next/navigation';
import type { TournamentAccessMode } from '@/types/database';

interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentDetailPage({ params }: Props) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (error || !tournament) {
    notFound();
  }

  const myRole = await getUserTournamentRole(tournamentId);
  const accessMode = (tournament.access_mode ?? 'private') as TournamentAccessMode;
  const canJoinAsSpectator = !myRole && accessMode === 'open';
  const isMember = myRole !== null;
  const canManage = myRole !== null && ORGANIZER_ROLES.includes(myRole);

  const [
    { count: playerCount },
    { data: teams },
    { data: auctions },
    staffResult,
  ] = await Promise.all([
    isMember
      ? supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
      : Promise.resolve({ count: 0 }),
    isMember
      ? supabase
          .from('teams')
          .select('id, name, short_name, primary_color, secondary_color, captain_name')
          .eq('tournament_id', tournamentId)
          .order('name')
      : Promise.resolve({ data: [] as never[] }),
    isMember
      ? supabase
          .from('auctions')
          .select('id, name, status')
          .eq('tournament_id', tournamentId)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    isMember ? listTournamentStaff(tournamentId) : Promise.resolve({ staff: [] }),
  ]);

  const staff = 'staff' in staffResult && Array.isArray(staffResult.staff)
    ? staffResult.staff
    : [];

  return (
    <TournamentHub
      tournamentId={tournamentId}
      tournament={{
        name: tournament.name,
        season: tournament.season,
        description: tournament.description,
        status: tournament.status,
        match_type: tournament.match_type,
        access_mode: accessMode,
        viewers_can_see_purse: tournament.viewers_can_see_purse === true,
        location: tournament.location ?? null,
        starts_at: tournament.starts_at ?? null,
        max_teams: tournament.max_teams ?? null,
        primary_color: tournament.primary_color,
      }}
      myRole={myRole}
      canManage={canManage}
      canJoinAsSpectator={canJoinAsSpectator}
      teamCount={teams?.length ?? 0}
      playerCount={playerCount ?? 0}
      teams={teams ?? []}
      auctions={auctions ?? []}
      staff={staff}
    />
  );
}
