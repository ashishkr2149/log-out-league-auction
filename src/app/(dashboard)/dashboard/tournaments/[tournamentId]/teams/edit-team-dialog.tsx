'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { teamSchema, TeamFormData } from '@/lib/validation/schemas';
import { updateTeam } from './actions';
import type { Team } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditTeamDialogProps {
  tournamentId: string;
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTeamDialog({ tournamentId, team, open, onOpenChange }: EditTeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: team.name,
      short_name: team.short_name,
      captain_name: team.captain_name ?? '',
      primary_color: team.primary_color,
      secondary_color: team.secondary_color,
      initial_purse: team.initial_purse,
      max_roster_size: team.max_roster_size,
      min_roster_size: team.min_roster_size,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: team.name,
        short_name: team.short_name,
        captain_name: team.captain_name ?? '',
        primary_color: team.primary_color,
        secondary_color: team.secondary_color,
        initial_purse: team.initial_purse,
        max_roster_size: team.max_roster_size,
        min_roster_size: team.min_roster_size,
      });
    }
  }, [open, team, reset]);

  async function onSubmit(data: TeamFormData) {
    setIsSubmitting(true);
    try {
      const result = await updateTeam(team.id, tournamentId, data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Team updated');
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Failed to update team');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Team</DialogTitle>
          <DialogDescription className="text-slate-400">
            Update team details. Captain counts as one roster slot.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Team Name *</Label>
            <Input {...register('name')} className="border-slate-700 bg-slate-800 text-white" />
            {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Short Name *</Label>
            <Input
              {...register('short_name')}
              maxLength={10}
              className="border-slate-700 bg-slate-800 text-white"
            />
            {errors.short_name && <p className="text-sm text-red-400">{errors.short_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Captain Name *</Label>
            <Input
              {...register('captain_name')}
              placeholder="Captain fills 1 roster slot"
              className="border-slate-700 bg-slate-800 text-white"
            />
            {errors.captain_name && (
              <p className="text-sm text-red-400">{errors.captain_name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Primary Color</Label>
              <Input
                type="color"
                {...register('primary_color')}
                className="h-10 w-full border-slate-700 bg-slate-800 cursor-pointer p-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Secondary Color</Label>
              <Input
                type="color"
                {...register('secondary_color')}
                className="h-10 w-full border-slate-700 bg-slate-800 cursor-pointer p-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Initial Purse *</Label>
            <Input
              type="number"
              {...register('initial_purse', { valueAsNumber: true })}
              className="border-slate-700 bg-slate-800 text-white"
            />
            {errors.initial_purse && (
              <p className="text-sm text-red-400">{errors.initial_purse.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Max Roster Size (includes captain)</Label>
            <Input
              type="number"
              {...register('max_roster_size', { valueAsNumber: true })}
              className="border-slate-700 bg-slate-800 text-white"
            />
            <p className="text-xs text-slate-500">
              Example: 6 total = 1 captain + 5 auction buys
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
