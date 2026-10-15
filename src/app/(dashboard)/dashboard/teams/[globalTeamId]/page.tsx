import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { ensurePersonForAuthUser } from '@/lib/auth/person';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { TeamHubTabs } from '@/components/teams/team-hub-tabs';
import { BackLink } from '@/components/shell/back-link';

interface Props {
  params: Promise<{ globalTeamId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function GlobalTeamHubPage({ params, searchParams }: Props) {
  const { globalTeamId } = await params;
  const { tab } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await ensurePersonForAuthUser(user);

  const service = await createServiceClient();
  const { data: team } = await service
    .from('global_teams')
    .select('*')
    .eq('id', globalTeamId)
    .maybeSingle();
  if (!team) notFound();

  const { data: members } = await service
    .from('team_memberships')
    .select(
      'id, role, persons!team_memberships_person_id_fkey(id, display_name, primary_email, primary_phone, claim_status)'
    )
    .eq('global_team_id', globalTeamId)
    .order('created_at', { ascending: true });

  const { count: entryCount } = await service
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('global_team_id', globalTeamId);

  const activeTab = tab || 'members';

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <BackLink fallbackHref="/dashboard/teams" />
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
        >
          {(team.short_name || team.name).slice(0, 3).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="page-title truncate">{team.name}</h1>
          <p className="caption mt-1">
            Public QR:{' '}
            <Link href={`/t/${team.qr_slug}`} className="text-primary hover:text-primary/80">
              /t/{team.qr_slug}
            </Link>
            <span className="mx-2">·</span>
            {entryCount ?? 0} tournament entries
          </p>
        </div>
      </div>

      <TeamHubTabs teamId={globalTeamId} active={activeTab} />

      {activeTab === 'members' && (
        <section className="panel space-y-3 p-4">
          <h2 className="section-title">Members</h2>
          <p className="caption">Global squad — tournament captains may differ per event</p>
          {!members?.length ? (
            <p className="caption py-6 text-center">No members yet.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const p = m.persons as
                  | {
                      display_name: string;
                      primary_email: string | null;
                      claim_status: string;
                    }
                  | {
                      display_name: string;
                      primary_email: string | null;
                      claim_status: string;
                    }[]
                  | null;
                const person = Array.isArray(p) ? p[0] : p;
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {person?.display_name || 'Player'}
                      </p>
                      <p className="caption truncate">{person?.primary_email ?? '—'}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Badge variant="outline" className="rounded-full capitalize">
                        {m.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          person?.claim_status === 'claimed'
                            ? 'rounded-full border-emerald-600 text-emerald-600'
                            : 'rounded-full border-amber-600 text-amber-600'
                        }
                      >
                        {person?.claim_status ?? 'unclaimed'}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'leaderboard' && (
        <section className="panel space-y-3 p-4">
          <h2 className="section-title">Leaderboard</h2>
          <p className="caption">Batting · bowling · fielding · MVP by match format</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {['Batting', 'Bowling', 'Fielding', 'MVP'].map((section) => (
              <div
                key={section}
                className="rounded-2xl border border-dashed border-border px-3 py-8 text-center"
              >
                <p className="text-sm font-medium text-foreground">{section}</p>
                <p className="caption mt-1">Fills after matches are scored</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'achievements' && (
        <section className="panel space-y-3 p-4">
          <h2 className="section-title">Achievements</h2>
          <p className="caption py-8 text-center">
            No achievements yet — unlocks when tournaments complete.
          </p>
        </section>
      )}

      {activeTab === 'stats' && (
        <section className="panel space-y-3 p-4">
          <h2 className="section-title">Team stats</h2>
          <p className="caption">Separate for tennis ball, leather, and box</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Matches', value: '—' },
              { label: 'Wins', value: '—' },
              { label: 'Losses', value: '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border px-3 py-3">
                <p className="caption">{s.label}</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
