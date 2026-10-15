import { createClient } from '@/lib/supabase/server';
import { getPersonIdForAuthUser } from '@/lib/auth/person';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, CalendarDays, Swords, Plus, ArrowRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  let teamCount = 0;
  if (user) {
    const personId = await getPersonIdForAuthUser(user.id);
    if (personId) {
      const { count } = await supabase
        .from('team_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('person_id', personId)
        .eq('status', 'active');
      teamCount = count ?? 0;
    }
  }

  // Matches land in Phase 3 — show honest zeros until then
  const matchesPlayed = 0;
  const upcomingMatches = 0;

  const stats = [
    {
      shortLabel: 'Teams',
      label: 'My teams',
      value: teamCount ?? 0,
      icon: Users,
      color: 'text-primary',
    },
    {
      shortLabel: 'Played',
      label: 'Matches played',
      value: matchesPlayed,
      icon: Swords,
      color: 'text-emerald-600',
    },
    {
      shortLabel: 'Upcoming',
      label: 'Upcoming matches',
      value: upcomingMatches,
      icon: CalendarDays,
      color: 'text-sky-600',
    },
  ];

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Home</h1>
          <p className="caption mt-1 truncate">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''} — jump back in
          </p>
        </div>
        <Link href="/dashboard/tournaments/new">
          <Button className="size-10 shrink-0 sm:w-auto sm:px-5" aria-label="New tournament">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New tournament</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="panel px-2 py-3 sm:px-4 sm:py-4">
              <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
                <Icon className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${stat.color}`} />
                <div className="min-w-0">
                  <p className="caption leading-tight truncate">
                    <span className="sm:hidden">{stat.shortLabel}</span>
                    <span className="hidden sm:inline">{stat.label}</span>
                  </p>
                  <p className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-foreground">Your tournaments</CardTitle>
            <CardDescription className="text-muted-foreground">
              Leagues you&apos;re part of
            </CardDescription>
          </div>
          <Link
            href="/dashboard/tournaments"
            aria-label="See all my tournaments"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </CardHeader>
        <CardContent>
          {!tournaments || tournaments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Trophy className="mb-3 h-11 w-11 text-muted-foreground" />
              <h3 className="section-title text-muted-foreground">No tournaments yet</h3>
              <p className="caption mt-2 max-w-sm">
                Create a league or join an open one to get started.
              </p>
              <Link href="/dashboard/tournaments/new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create tournament
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/dashboard/tournaments/${tournament.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-3 transition-colors hover:bg-muted/70 sm:px-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: tournament.primary_color + '22' }}
                    >
                      <Trophy
                        className="h-5 w-5"
                        style={{ color: tournament.primary_color }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-foreground">
                        {tournament.name}
                      </h3>
                      <p className="caption">
                        {/^season\b/i.test(tournament.season)
                          ? tournament.season
                          : `Season ${tournament.season}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="rounded-full capitalize">
                      {tournament.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
              <Link
                href="/dashboard/tournaments"
                className="mt-2 flex items-center justify-center gap-1 pt-1 text-sm font-medium text-primary"
              >
                See all tournaments
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
