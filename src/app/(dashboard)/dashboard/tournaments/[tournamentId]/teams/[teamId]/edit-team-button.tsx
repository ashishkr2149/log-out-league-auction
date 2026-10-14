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
        className="border-slate-700 text-slate-300 shrink-0"
        onClick={() => setOpen(true)}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Edit Team
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
