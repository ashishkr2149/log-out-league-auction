'use client';

import { useState } from 'react';
import type { Team } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { EditTeamDialog } from '../edit-team-dialog';

interface EditTeamButtonProps {
  tournamentId: string;
  team: Team;
}

export function EditTeamButton({ tournamentId, team }: EditTeamButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="border-slate-700 text-slate-300 shrink-0 size-9 sm:size-auto sm:h-10 sm:px-4"
        aria-label="Edit Team"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Edit Team</span>
      </Button>
      <EditTeamDialog
        tournamentId={tournamentId}
        team={team}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
