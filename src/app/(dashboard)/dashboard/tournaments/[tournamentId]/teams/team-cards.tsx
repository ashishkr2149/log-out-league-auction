'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Team } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, getEffectiveRosterCount } from '@/lib/auction/validation';
import { EditTeamDialog } from './edit-team-dialog';
import { Pencil } from 'lucide-react';

type TeamWithStats = Team & {
  spent: number;
  remaining_purse: number;
  roster_count: number;
  qr_slug?: string | null;
};

interface TeamCardsProps {
  tournamentId: string;
  teams: TeamWithStats[];
  /** When false, hide purse amounts (viewer restriction). */
  showPurse?: boolean;
}

export function TeamCards({ tournamentId, teams, showPurse = true }: TeamCardsProps) {
  const [editingTeam, setEditingTeam] = useState<TeamWithStats | null>(null);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const effectiveRoster = getEffectiveRosterCount(team);
          const isFull = effectiveRoster >= team.max_roster_size;

          return (
            <Card
              key={team.id}
              className="border-border bg-card transition hover:border-border hover:bg-card relative"
            >
              <Link
                href={`/dashboard/tournaments/${tournamentId}/teams/${team.id}`}
                className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                aria-label={`View ${team.name} details`}
              />
              <CardHeader className="relative z-10 pointer-events-none">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold shrink-0"
                      style={{
                        backgroundColor: team.primary_color,
                        color: team.secondary_color,
                      }}
                    >
                      {team.short_name.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-foreground text-base truncate">{team.name}</CardTitle>
                      <CardDescription className="text-muted-foreground truncate">
                        {team.captain_name
                          ? `Captain: ${team.captain_name}`
                          : team.short_name}
                        {team.qr_slug ? ` · /t/${team.qr_slug}` : ''}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
                    <Badge
                      variant="outline"
                      className={
                        team.is_active
                          ? 'border-emerald-600 text-emerald-600'
                          : 'border-red-600 text-primary'
                      }
                    >
                      {team.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label={`Edit ${team.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingTeam(team);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pointer-events-none">
                <div className="space-y-3">
                  {showPurse ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Initial Purse</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(team.initial_purse)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Spent</span>
                        <span className="font-medium text-primary">
                          {formatCurrency(team.spent)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(team.remaining_purse)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Purse hidden for spectators</p>
                  )}
                  <div className="h-px bg-muted" />
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">Roster</span>
                    <span
                      className={`font-medium text-right ${isFull ? 'text-emerald-600' : 'text-foreground'}`}
                    >
                      {effectiveRoster}/{team.max_roster_size}
                      {team.captain_name ? (
                        <span className="text-muted-foreground font-normal hidden sm:inline">
                          {' '}
                          ({team.roster_count} bought + captain)
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editingTeam && (
        <EditTeamDialog
          tournamentId={tournamentId}
          team={editingTeam}
          open={Boolean(editingTeam)}
          onOpenChange={(open) => {
            if (!open) setEditingTeam(null);
          }}
        />
      )}
    </>
  );
}
