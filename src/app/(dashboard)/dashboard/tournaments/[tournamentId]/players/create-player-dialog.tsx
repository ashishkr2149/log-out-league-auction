'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { playerSchema, PlayerFormData, playerRoles, battingStyles, bowlingStyles } from '@/lib/validation/schemas';
import { createPlayer } from './actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getRoleLabel } from '@/lib/auction/validation';

interface CreatePlayerDialogProps {
  tournamentId: string;
}

export function CreatePlayerDialog({ tournamentId }: CreatePlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      role: 'other',
      base_price: 1,
    },
  });

  async function onSubmit(data: PlayerFormData) {
    setIsSubmitting(true);
    try {
      const result = await createPlayer(tournamentId, data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Player created successfully');
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error('Failed to create player');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-red-600 hover:bg-red-700 text-white" />
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Player
      </DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-900 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Player</DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a player to this tournament
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Full Name *</Label>
              <Input
                {...register('name')}
                placeholder="Full name"
                className="border-slate-700 bg-slate-800 text-white"
              />
              {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Display Name *</Label>
              <Input
                {...register('display_name')}
                placeholder="Short display name"
                className="border-slate-700 bg-slate-800 text-white"
              />
              {errors.display_name && <p className="text-sm text-red-400">{errors.display_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Jersey Number</Label>
              <Input
                {...register('jersey_number')}
                placeholder="e.g., 7"
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Role *</Label>
              <Select
                value={watch('role')}
                onValueChange={(v) => setValue('role', v as PlayerFormData['role'])}
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  {playerRoles.map((role) => (
                    <SelectItem key={role} value={role} className="text-white">
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Batting Style</Label>
              <Select
                value={watch('batting_style') ?? ''}
                onValueChange={(v) => setValue('batting_style', v as PlayerFormData['batting_style'])}
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  {battingStyles.map((style) => (
                    <SelectItem key={style} value={style} className="text-white">
                      {style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Bowling Style</Label>
              <Select
                value={watch('bowling_style') ?? ''}
                onValueChange={(v) => setValue('bowling_style', v as PlayerFormData['bowling_style'])}
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  {bowlingStyles.map((style) => (
                    <SelectItem key={style} value={style} className="text-white">
                      {style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Base Price *</Label>
              <Input
                type="number"
                {...register('base_price', { valueAsNumber: true })}
                className="border-slate-700 bg-slate-800 text-white"
              />
              {errors.base_price && <p className="text-sm text-red-400">{errors.base_price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Category</Label>
              <Input
                {...register('category')}
                placeholder="e.g., A, B, C"
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Previous Team</Label>
            <Input
              {...register('previous_team')}
              placeholder="Previous team name"
              className="border-slate-700 bg-slate-800 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Bio</Label>
            <Textarea
              {...register('bio')}
              placeholder="Short bio..."
              rows={2}
              className="border-slate-700 bg-slate-800 text-white"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Player
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
