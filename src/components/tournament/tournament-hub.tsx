'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  MapPin,
  Users,
  Trophy,
  Gavel,
  Table2,
  Settings2,
  LayoutGrid,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompactSelect, SegmentedTabs } from '@/components/ui/segmented-tabs';
import { LocalDateTime } from '@/components/ui/local-datetime';
import { BackLink } from '@/components/shell/back-link';
import { StaffInvitePanel } from '@/components/tournament/staff-invite-panel';
import { TournamentSettingsPanel } from '@/components/tournament/tournament-settings-panel';
import { JoinOpenTournamentButton } from '@/components/tournament/join-open-tournament-button';
import type { TournamentAccessMode, TournamentStatus } from '@/types/database';

type TabId = 'overview' | 'teams' | 'leaderboard' | 'auction' | 'points' | 'settings';

type StaffRow = Parameters<typeof StaffInvitePanel>[0]['initialStaff'][number];

type TeamRow = {
  id: string;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
  captain_name: string | null;
};

type AuctionRow = {
  id: string;
  name: string;
  status: string;
};

const LEADERBOARD_KINDS = ['batting', 'bowling', 'fielding', 'mvp'] as const;
type LeaderboardKind = (typeof LEADERBOARD_KINDS)[number];

const BATTING_SORTS = [
  { id: 'average', label: 'Highest average' },
  { id: 'strike_rate', label: 'Strike rate' },
  { id: 'sixes', label: 'Most 6s' },
  { id: 'fours', label: 'Most 4s' },
] as const;

export function TournamentHub({
  tournamentId,
  tournament,
  myRole,
  canManage,
  canJoinAsSpectator,
  teamCount,
  playerCount,
  teams,
  auctions,
  staff,
}: {
  tournamentId: string;
  tournament: {
    name: string;
    season: string;
    description: string | null;
    status: TournamentStatus;
    match_type: string;
    access_mode: TournamentAccessMode;
    viewers_can_see_purse: boolean;
    location: string | null;
    starts_at: string | null;
    max_teams: number | null;
    primary_color: string;
  };
  myRole: string | null;
  canManage: boolean;
  canJoinAsSpectator: boolean;
  teamCount: number;
  playerCount: number;
  teams: TeamRow[];
  auctions: AuctionRow[];
  staff: StaffRow[];
}) {
  const [tab, setTab] = useState<TabId>('overview');
  const [lbKind, setLbKind] = useState<LeaderboardKind>('batting');
  const [battingSort, setBattingSort] = useState<(typeof BATTING_SORTS)[number]['id']>('average');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  const tabs = useMemo(() => {
    const base: { id: TabId; label: string; icon: React.ElementType }[] = [
      { id: 'overview', label: 'Overview', icon: LayoutGrid },
      { id: 'teams', label: 'Teams', icon: Users },
      { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
      { id: 'auction', label: 'Auction', icon: Gavel },
      { id: 'points', label: 'Points', icon: Table2 },
    ];
    if (canManage) {
      base.push({ id: 'settings', label: 'Settings', icon: Settings2 });
    }
    return base;
  }, [canManage]);

  const lbItems = useMemo(
    () =>
      LEADERBOARD_KINDS.map((k) => ({
        id: k,
        label: k === 'mvp' ? 'MVP' : k.charAt(0).toUpperCase() + k.slice(1),
      })),
    []
  );

  const liveAuction = auctions.find((a) => a.status === 'live' || a.status === 'paused');

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <BackLink fallbackHref="/dashboard/tournaments" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title truncate">{tournament.name}</h1>
            <Badge variant="outline" className="rounded-full capitalize">
              {tournament.status}
            </Badge>
            <Badge variant="outline" className="rounded-full capitalize">
              {tournament.access_mode}
            </Badge>
          </div>
          <p className="caption mt-1">
            {/^season\b/i.test(tournament.season)
              ? tournament.season
              : `Season ${tournament.season}`}
            {myRole
              ? ` · Your role: ${myRole === 'viewer' ? 'spectator' : myRole.replace(/_/g, ' ')}`
              : ''}
          </p>
          {canJoinAsSpectator && (
            <div className="mt-3">
              <JoinOpenTournamentButton tournamentId={tournamentId} />
            </div>
          )}
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <SegmentedTabs
          aria-label="Tournament sections"
          value={tab}
          onValueChange={setTab}
          items={tabs}
        />
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="panel space-y-3 p-4">
            <h2 className="section-title">About</h2>
            <p className="text-sm text-muted-foreground">
              {tournament.description?.trim() || 'No description yet.'}
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <dt className="caption">Starts</dt>
                  <dd className="text-sm font-medium">
                    <LocalDateTime iso={tournament.starts_at} />
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <dt className="caption">Location</dt>
                  <dd className="text-sm font-medium">
                    {tournament.location?.trim() || 'Venue TBA'}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <dt className="caption">Teams</dt>
                  <dd className="text-sm font-medium">
                    {teamCount}
                    {tournament.max_teams ? ` / ${tournament.max_teams} max` : ' entered'}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Trophy className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <dt className="caption">Format</dt>
                  <dd className="text-sm font-medium capitalize">
                    {tournament.match_type.replace(/_/g, ' ')}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {liveAuction && (
            <Link href={`/dashboard/auctions/${liveAuction.id}/control`}>
              <Button className="w-full sm:w-auto">Open live auction</Button>
            </Link>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Teams', value: teamCount },
              { label: 'Players', value: playerCount },
              { label: 'Auctions', value: auctions.length },
            ].map((s) => (
              <div key={s.label} className="panel px-3 py-3 text-center">
                <p className="caption">{s.label}</p>
                <p className="text-xl font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'teams' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="section-title">Teams</h2>
            <Link href={`/dashboard/tournaments/${tournamentId}/teams`}>
              <Button size="sm" variant="outline">
                Manage
              </Button>
            </Link>
          </div>
          {teams.length === 0 ? (
            <div className="panel flex flex-col items-center px-4 py-10 text-center">
              <p className="caption">No teams in yet.</p>
              <Link
                href={`/dashboard/tournaments/${tournamentId}/teams`}
                className="mt-3"
              >
                <Button size="sm">Add teams</Button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {teams.map((team) => (
                <li key={team.id}>
                  <Link
                    href={`/dashboard/tournaments/${tournamentId}/teams/${team.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: team.primary_color,
                        color: team.secondary_color,
                      }}
                    >
                      {team.short_name.slice(0, 3)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{team.name}</p>
                      <p className="caption truncate">
                        {team.captain_name ? `Captain: ${team.captain_name}` : 'No captain'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1">
            <SegmentedTabs
              size="sm"
              aria-label="Leaderboard category"
              value={lbKind}
              onValueChange={setLbKind}
              items={lbItems}
              className="shrink-0"
            />
            {lbKind === 'batting' ? (
              <CompactSelect
                aria-label="Batting sort"
                value={battingSort}
                onChange={(e) =>
                  setBattingSort(e.target.value as typeof battingSort)
                }
              >
                {BATTING_SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </CompactSelect>
            ) : null}
            <CompactSelect
              aria-label="Team filter"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="all">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </CompactSelect>
          </div>

          <div className="panel px-4 py-10 text-center">
            <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="section-title text-muted-foreground">Leaderboard coming soon</p>
            <p className="caption mx-auto mt-2 max-w-sm">
              {lbKind === 'batting'
                ? `Sorted by ${BATTING_SORTS.find((s) => s.id === battingSort)?.label ?? 'average'}`
                : `${lbKind} rankings`}
              {teamFilter !== 'all'
                ? ` · ${teams.find((t) => t.id === teamFilter)?.name ?? 'team'}`
                : ' · overall'}
              . Stats fill in after matches are scored.
            </p>
          </div>
        </div>
      )}

      {tab === 'auction' && (
        <div className="space-y-3">
          <h2 className="section-title">Auction</h2>
          {auctions.length === 0 ? (
            <div className="panel px-4 py-10 text-center">
              <p className="caption">No auction yet.</p>
              {canManage && (
                <Link
                  href={`/dashboard/tournaments/${tournamentId}/auctions`}
                  className="mt-3 inline-block"
                >
                  <Button size="sm">Set up auction</Button>
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {auctions.map((a) => (
                <li key={a.id} className="panel flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="caption capitalize">{a.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/auctions/${a.id}/results`}>
                      <Button size="sm" variant="outline">
                        Results
                      </Button>
                    </Link>
                    <Link href={`/dashboard/auctions/${a.id}/control`}>
                      <Button size="sm">Open</Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'points' && (
        <div className="panel px-4 py-10 text-center">
          <Table2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="section-title text-muted-foreground">Points table coming soon</p>
          <p className="caption mx-auto mt-2 max-w-sm">
            Standings show up once formats & matches are live.
          </p>
        </div>
      )}

      {tab === 'settings' && canManage && (
        <div className="space-y-5">
          <div className="panel space-y-3 p-4">
            <h2 className="section-title">Access & visibility</h2>
            <TournamentSettingsPanel
              tournamentId={tournamentId}
              accessMode={tournament.access_mode}
              viewersCanSeePurse={tournament.viewers_can_see_purse}
              status={tournament.status}
              location={tournament.location}
              startsAt={tournament.starts_at}
              maxTeams={tournament.max_teams}
              canManage={canManage}
            />
          </div>
          <div className="panel space-y-3 p-4">
            <h2 className="section-title">Staff & roles</h2>
            <p className="caption">
              Invite by email — they claim by signing up with the same address.
            </p>
            <StaffInvitePanel
              tournamentId={tournamentId}
              initialStaff={staff}
              canManage={canManage}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/tournaments/${tournamentId}/players`}>
              <Button variant="outline" size="sm">
                Players roster
              </Button>
            </Link>
            <Link href={`/dashboard/tournaments/${tournamentId}/auctions`}>
              <Button variant="outline" size="sm">
                Auction settings
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
