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
};

interface TeamCardsProps {
  tournamentId: string;
  teams: TeamWithStats[];
}

export function TeamCards({ tournamentId, teams }: TeamCardsProps) {
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
              className="border-slate-800 bg-slate-900/80 transition hover:border-slate-600 hover:bg-slate-900 relative"
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
                      <CardTitle className="text-white text-base truncate">{team.name}</CardTitle>
                      <CardDescription className="text-slate-400 truncate">
                        {team.captain_name
                          ? `Captain: ${team.captain_name}`
                          : team.short_name}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
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
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
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
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Initial Purse</span>
                    <span className="font-medium text-white">
                      {formatCurrency(team.initial_purse)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Spent</span>
                    <span className="font-medium text-red-400">
                      {formatCurrency(team.spent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Remaining</span>
                    <span className="font-medium text-green-400">
                      {formatCurrency(team.remaining_purse)}
                    </span>
                  </div>
                  <div className="h-px bg-slate-800" />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Roster</span>
                    <span className={`font-medium ${isFull ? 'text-green-400' : 'text-white'}`}>
                      {effectiveRoster} / {team.max_roster_size}
                      {team.captain_name ? (
                        <span className="text-slate-500 font-normal">
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
