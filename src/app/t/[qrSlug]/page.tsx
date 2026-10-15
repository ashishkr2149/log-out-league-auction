import { getGlobalTeamByQrSlug } from '@/lib/teams/global';
import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface Props {
  params: Promise<{ qrSlug: string }>;
}

export default async function PublicTeamQrPage({ params }: Props) {
  const { qrSlug } = await params;
  const result = await getGlobalTeamByQrSlug(qrSlug);
  if ('error' in result) notFound();

  const team = result.team;
  const service = await createServiceClient();
  const { count: memberCount } = await service
    .from('team_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('global_team_id', team.id);

  const { count: entryCount } = await service
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('global_team_id', team.id);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold"
          style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
        >
          {(team.short_name || team.name).slice(0, 3).toUpperCase()}
        </div>
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Team</p>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          {team.description && (
            <p className="mt-2 text-muted-foreground">{team.description}</p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <dt className="text-muted-foreground">Members</dt>
            <dd className="text-xl font-semibold">{memberCount ?? 0}</dd>
          </div>
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <dt className="text-muted-foreground">Tournament entries</dt>
            <dd className="text-xl font-semibold">{entryCount ?? 0}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          QR code: <code className="text-muted-foreground">/t/{team.qr_slug}</code>
        </p>
        <Link href="/login" className="text-sm text-primary hover:text-primary/80">
          Sign in to claim roles or manage teams →
        </Link>
      </div>
    </div>
  );
}
