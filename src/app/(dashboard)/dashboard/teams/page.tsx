import { createClient } from '@/lib/supabase/server';
import { ensurePersonForAuthUser } from '@/lib/auth/person';
import { listMyGlobalTeams } from '@/lib/teams/global';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, ChevronRight, Plus } from 'lucide-react';

export default async function MyTeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const me = await ensurePersonForAuthUser(user);
  if ('error' in me) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
        {me.error}
      </div>
    );
  }

  const listed = await listMyGlobalTeams(me.person.id);
  const teams = ('teams' in listed ? listed.teams : null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="page-title">My teams</h1>
            <p className="caption mt-1">
              Franchises you captain or play for
            </p>
          </div>
        </div>
        <Link href="/dashboard/tournaments">
          <Button size="sm" variant="outline" className="shrink-0">
            <Plus className="mr-1.5 h-4 w-4" />
            Via tournament
          </Button>
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="panel flex flex-col items-center px-4 py-12 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="section-title text-muted-foreground">No teams yet</p>
          <p className="caption mt-2 max-w-sm">
            Create one when adding a team to a tournament, or accept a captain invite.
          </p>
          <Link href="/dashboard/tournaments" className="mt-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Go to tournaments
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {teams.map((team) => (
            <li key={team.id}>
              <Link
                href={`/dashboard/teams/${team.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/50"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: team.primary_color,
                    color: team.secondary_color,
                  }}
                >
                  {(team.short_name || team.name).slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{team.name}</p>
                  <p className="caption truncate">/t/{team.qr_slug}</p>
                </div>
                {team.my_role ? (
                  <Badge variant="outline" className="shrink-0 rounded-full capitalize">
                    {team.my_role}
                  </Badge>
                ) : null}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
