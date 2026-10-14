'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { teamSchema, TeamFormData } from '@/lib/validation/schemas';
import { createTeam } from './actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateTeamDialogProps {
  tournamentId: string;
}

export function CreateTeamDialog({ tournamentId }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false);
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
      primary_color: '#3498db',
      secondary_color: '#ffffff',
      initial_purse: 100,
      max_roster_size: 6,
      captain_name: '',
    },
  });

  async function onSubmit(data: TeamFormData) {
    setIsSubmitting(true);
    try {
      const result = await createTeam(tournamentId, data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Team created successfully');
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error('Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            className="bg-red-600 hover:bg-red-700 text-white size-9 sm:size-auto sm:h-10 sm:px-4"
            aria-label="Add Team"
          />
        }
      >
        <Plus className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Add Team</span>
      </DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-900 max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Team</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new team for this tournament
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Team Name *</Label>
            <Input
              {...register('name')}
              placeholder="e.g., Royal Strikers"
              className="border-slate-700 bg-slate-800 text-white"
            />
            {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Short Name *</Label>
            <Input
              {...register('short_name')}
              placeholder="e.g., RST"
              maxLength={10}
              className="border-slate-700 bg-slate-800 text-white"
            />
            {errors.short_name && <p className="text-sm text-red-400">{errors.short_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Captain Name *</Label>
            <Input
              {...register('captain_name')}
              placeholder="e.g., Ankit"
              className="border-slate-700 bg-slate-800 text-white"
            />
            {errors.captain_name && (
              <p className="text-sm text-red-400">{errors.captain_name.message}</p>
            )}
            <p className="text-xs text-slate-500">Captain counts as 1 roster slot</p>
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
            {errors.initial_purse && <p className="text-sm text-red-400">{errors.initial_purse.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Max Roster Size (includes captain)</Label>
            <Input
              type="number"
              {...register('max_roster_size', { valueAsNumber: true })}
              className="border-slate-700 bg-slate-800 text-white"
            />
            <p className="text-xs text-slate-500">Default 6 = 1 captain + 5 auction buys</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Team
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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
