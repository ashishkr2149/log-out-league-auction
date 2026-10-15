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
            className="bg-primary hover:bg-primary/90 text-primary-foreground size-9 sm:size-auto sm:h-10 sm:px-4"
            aria-label="Add Team"
          />
        }
      >
        <Plus className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Add Team</span>
      </DialogTrigger>
      <DialogContent className="border-border bg-card max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Team</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new team for this tournament
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Team Name *</Label>
            <Input
              {...register('name')}
              placeholder="e.g., Royal Strikers"
              className="border-border bg-muted text-foreground"
            />
            {errors.name && <p className="text-sm text-primary">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Short Name *</Label>
            <Input
              {...register('short_name')}
              placeholder="e.g., RST"
              maxLength={10}
              className="border-border bg-muted text-foreground"
            />
            {errors.short_name && <p className="text-sm text-primary">{errors.short_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Captain Name *</Label>
            <Input
              {...register('captain_name')}
              placeholder="e.g., Ankit"
              className="border-border bg-muted text-foreground"
            />
            {errors.captain_name && (
              <p className="text-sm text-primary">{errors.captain_name.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Captain counts as 1 roster slot</p>
          </div>
          <p className="caption">Team colors are picked automatically.</p>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Initial Purse *</Label>
            <Input
              type="number"
              {...register('initial_purse', { valueAsNumber: true })}
              className="border-border bg-muted text-foreground"
            />
            {errors.initial_purse && <p className="text-sm text-primary">{errors.initial_purse.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Max Roster Size (includes captain)</Label>
            <Input
              type="number"
              {...register('max_roster_size', { valueAsNumber: true })}
              className="border-border bg-muted text-foreground"
            />
            <p className="text-xs text-muted-foreground">Default 6 = 1 captain + 5 auction buys</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Team
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
