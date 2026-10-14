import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Users } from 'lucide-react';
import Link from 'next/link';
import {
  formatCurrency,
  getEffectiveRosterCount,
  getRoleLabel,
} from '@/lib/auction/validation';
import { EditTeamButton } from './edit-team-button';

interface Props {
  params: Promise<{ tournamentId: string; teamId: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { tournamentId, teamId } = await params;
  const supabase = await createClient();

  const [{ data: tournament }, { data: team }] = await Promise.all([
    supabase.from('tournaments').select('id, name').eq('id', tournamentId).single(),
    supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .eq('tournament_id', tournamentId)
      .single(),
  ]);

  if (!tournament || !team) notFound();

  const [{ data: purchases }, { data: auction }] = await Promise.all([
    supabase
      .from('auction_purchases')
      .select(
        `
        id,
        final_price,
        sold_at,
        player:players (
          id,
          name,
          display_name,
          role,
          category,
          jersey_number
        )
      `
      )
      .eq('team_id', teamId)
      .eq('status', 'confirmed')
      .order('sold_at', { ascending: true }),
    supabase
      .from('auctions')
      .select('currency_code')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const spent = (purchases ?? []).reduce((sum, p) => sum + p.final_price, 0);
  const remaining = team.initial_purse - spent;
  const rosterCount = purchases?.length ?? 0;
  const effectiveRoster = getEffectiveRosterCount({
    roster_count: rosterCount,
    captain_name: team.captain_name,
  });
  const currency = auction?.currency_code ?? 'INR';
  const money = (amount: number) => formatCurrency(amount, currency);

  type PurchaseRow = NonNullable<typeof purchases>[number];
  type PlayerEmbed = {
    id: string;
    name: string;
    display_name: string;
    role: string;
    category: string | null;
    jersey_number: string | null;
  };

  const boughtPlayers = (purchases ?? [])
    .map((row: PurchaseRow) => {
      const player = row.player as unknown as PlayerEmbed | PlayerEmbed[] | null;
      const p = Array.isArray(player) ? player[0] : player;
      if (!p) return null;
      return { ...p, final_price: row.final_price, sold_at: row.sold_at };
    })
    .filter(Boolean) as Array<PlayerEmbed & { final_price: number; sold_at: string }>;

  const stats = [
    { label: 'Purse', fullLabel: 'Initial Purse', value: money(team.initial_purse), color: 'text-white' },
    { label: 'Spent', fullLabel: 'Spent', value: money(spent), color: 'text-red-400' },
    { label: 'Left', fullLabel: 'Remaining', value: money(remaining), color: 'text-green-400' },
    {
      label: 'Roster',
      fullLabel: 'Roster',
      value: `${effectiveRoster}/${team.max_roster_size}`,
      color: 'text-white',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href={`/dashboard/tournaments/${tournamentId}/teams`}>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl text-sm font-bold shrink-0"
              style={{
                backgroundColor: team.primary_color,
                color: team.secondary_color,
              }}
            >
              {team.short_name.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{team.name}</h1>
                <Badge
                  variant="outline"
                  className={
                    team.is_active
                      ? 'border-green-600 text-green-400'
                      : 'border-red-600 text-red-400'
                  }
                >
                  {team.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="mt-1 text-slate-400 truncate">{tournament.name}</p>
            </div>
          </div>
        </div>
        <EditTeamButton tournamentId={tournamentId} team={team} />
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {stats.map((stat) => (
          <Card key={stat.fullLabel} className="border-slate-800 bg-slate-900/80">
            <CardContent className="px-1.5 py-3 sm:p-4 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                <span className="sm:hidden">{stat.label}</span>
                <span className="hidden sm:inline">{stat.fullLabel}</span>
              </p>
              <p className={`mt-1 text-sm sm:text-xl font-bold leading-tight ${stat.color}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            Squad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {team.captain_name ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-900/40 bg-yellow-950/20 px-3 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/15 text-yellow-400 shrink-0">
                  <Crown className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{team.captain_name}</p>
                  <p className="text-xs text-yellow-500/80">Captain · roster slot</p>
                </div>
              </div>
              <Badge variant="outline" className="border-yellow-700 text-yellow-400 shrink-0">
                Captain
              </Badge>
            </div>
          ) : null}

          {boughtPlayers.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No auction purchases yet for this team
            </p>
          ) : (
            boughtPlayers.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-slate-500 w-5 shrink-0">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">
                      {player.name}
                      {player.jersey_number ? (
                        <span className="ml-2 text-xs text-slate-500">#{player.jersey_number}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getRoleLabel(player.role)}
                      {player.category ? ` · ${player.category}` : ''}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm text-white shrink-0">
                  {money(player.final_price)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
