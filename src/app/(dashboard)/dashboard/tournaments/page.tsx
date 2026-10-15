import { createClient } from '@/lib/supabase/server';
import { getPersonIdForAuthUser } from '@/lib/auth/person';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Plus } from 'lucide-react';
import Link from 'next/link';
import { TournamentsTabs } from '@/components/tournament/tournaments-tabs';
import type { TournamentListItem } from '@/components/tournament/tournament-list-cards';

export default async function TournamentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  let myIds = new Set<string>();
  if (user) {
    const personId = await getPersonIdForAuthUser(user.id);
    if (personId) {
      const { data: assignments } = await supabase
        .from('tournament_role_assignments')
        .select('tournament_id')
        .eq('person_id', personId);
      for (const a of assignments ?? []) myIds.add(a.tournament_id);
    }
    const { data: members } = await supabase
      .from('tournament_members')
      .select('tournament_id')
      .eq('user_id', user.id);
    for (const m of members ?? []) myIds.add(m.tournament_id);
    for (const t of tournaments ?? []) {
      if (t.created_by === user.id) myIds.add(t.id);
    }
  }

  const all = tournaments ?? [];
  const toItem = (tournament: (typeof all)[number]): TournamentListItem => ({
    id: tournament.id,
    name: tournament.name,
    season: tournament.season,
    status: tournament.status,
    accessMode: tournament.access_mode ?? 'private',
    description: tournament.description,
    primaryColor: tournament.primary_color,
    secondaryColor: tournament.secondary_color,
  });

  const mine = all.filter((t) => myIds.has(t.id)).map(toItem);
  const open = all.filter((t) => t.access_mode === 'open').map(toItem);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Tournaments</h1>
          <p className="caption mt-1">Your leagues and open ones you can join</p>
        </div>
        <Link href="/dashboard/tournaments/new">
          <Button size="icon" className="sm:h-10 sm:w-auto sm:px-5" aria-label="New tournament">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New tournament</span>
          </Button>
        </Link>
      </div>

      {all.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="mb-4 h-14 w-14 text-muted-foreground" />
            <h3 className="section-title text-muted-foreground">No tournaments yet</h3>
            <p className="caption mt-2 max-w-md text-center">
              Create your first league to manage teams, players, and auctions.
            </p>
            <Link href="/dashboard/tournaments/new" className="mt-6">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create tournament
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <TournamentsTabs mine={mine} open={open} />
      )}
    </div>
  );
}
