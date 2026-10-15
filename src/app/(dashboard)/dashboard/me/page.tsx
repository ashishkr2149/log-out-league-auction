import { createClient } from '@/lib/supabase/server';
import { ensurePersonForAuthUser, listPersonRoles } from '@/lib/auth/person';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { BackLink } from '@/components/shell/back-link';

function roleLabel(role: string) {
  if (role === 'viewer') return 'spectator';
  return role.replace(/_/g, ' ');
}

export default async function MyIdentityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ensured = await ensurePersonForAuthUser(user);
  if ('error' in ensured) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
        {ensured.error}
      </div>
    );
  }

  const person = ensured.person;
  const roles = await listPersonRoles(person.id);
  if ('error' in roles) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
        {roles.error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <BackLink fallbackHref="/dashboard" />
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="page-title truncate">
            {person.display_name || 'My profile'}
          </h1>
          <p className="caption mt-1">
            Your identity, roles, and roster links
          </p>
        </div>
      </div>

      <section className="panel space-y-3 p-4">
        <h2 className="section-title">Identity</h2>
        <p className="caption">
          Claimed via verified login. Organizers can add you by email before you sign up.
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{person.primary_email ?? user.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-foreground">{person.primary_phone ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant="outline" className="rounded-full border-emerald-600 text-emerald-600">
                {person.claim_status}
              </Badge>
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="section-title">Staff & match roles</h2>
        <p className="caption">Organizer, scorer, umpire, spectator, and more</p>
        {roles.assignments.length === 0 ? (
          <div className="py-6 text-center">
            <p className="caption">No staff roles yet.</p>
            <Link href="/dashboard/tournaments" className="mt-3 inline-block">
              <Button size="sm" variant="outline">
                Browse tournaments
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {roles.assignments.map((row) => {
              const tournament = row.tournaments as
                | { id: string; name: string; season: string; status: string }
                | { id: string; name: string; season: string; status: string }[]
                | null;
              const t = Array.isArray(tournament) ? tournament[0] : tournament;
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    {t ? (
                      <Link
                        href={`/dashboard/tournaments/${t.id}`}
                        className="block truncate font-medium text-foreground hover:text-primary"
                      >
                        {t.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Tournament</span>
                    )}
                    {t ? <p className="caption">Season {t.season}</p> : null}
                  </div>
                  <Badge variant="outline" className="shrink-0 rounded-full capitalize">
                    {roleLabel(row.role)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="section-title">Player roster</h2>
        <p className="caption">Tournaments where you were added as a player</p>
        {roles.roster.length === 0 ? (
          <div className="py-6 text-center">
            <p className="caption">Not on any roster yet.</p>
            <Link href="/dashboard/teams" className="mt-3 inline-block">
              <Button size="sm" variant="outline">
                See my teams
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {roles.roster.map((row) => {
              const tournament = row.tournaments as
                | { id: string; name: string; season: string }
                | { id: string; name: string; season: string }[]
                | null;
              const t = Array.isArray(tournament) ? tournament[0] : tournament;
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {row.display_name || row.name}
                    </p>
                    {t ? (
                      <Link
                        href={`/dashboard/tournaments/${t.id}/players`}
                        className="caption hover:text-primary"
                      >
                        {t.name} · Season {t.season}
                      </Link>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="shrink-0 rounded-full border-sky-600 text-sky-600">
                    player · {row.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
