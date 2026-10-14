'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  playerSchema,
  PlayerFormData,
  playerRoles,
  battingStyles,
  bowlingStyles,
} from '@/lib/validation/schemas';
import { updatePlayer } from './actions';
import type { Player } from '@/types/database';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getRoleLabel } from '@/lib/auction/validation';

interface EditPlayerDialogProps {
  tournamentId: string;
  player: Player;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPlayerDialog({
  tournamentId,
  player,
  open,
  onOpenChange,
}: EditPlayerDialogProps) {
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
      name: player.name,
      display_name: player.display_name,
      jersey_number: player.jersey_number,
      role: player.role,
      batting_style: player.batting_style,
      bowling_style: player.bowling_style,
      base_price: player.base_price,
      category: player.category,
      bio: player.bio,
      previous_team: player.previous_team,
      auction_order: player.auction_order,
      notes: player.notes,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: player.name,
        display_name: player.display_name,
        jersey_number: player.jersey_number,
        role: player.role,
        batting_style: player.batting_style,
        bowling_style: player.bowling_style,
        base_price: player.base_price,
        category: player.category,
        bio: player.bio,
        previous_team: player.previous_team,
        auction_order: player.auction_order,
        notes: player.notes,
      });
    }
  }, [open, player, reset]);

  async function onSubmit(data: PlayerFormData) {
    setIsSubmitting(true);
    try {
      const result = await updatePlayer(player.id, tournamentId, data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Player updated');
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Failed to update player');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Player</DialogTitle>
          <DialogDescription className="text-slate-400">
            Update details for {player.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Full Name *</Label>
              <Input {...register('name')} className="border-slate-700 bg-slate-800 text-white" />
              {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Display Name *</Label>
              <Input
                {...register('display_name')}
                className="border-slate-700 bg-slate-800 text-white"
              />
              {errors.display_name && (
                <p className="text-sm text-red-400">{errors.display_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Jersey Number</Label>
              <Input
                {...register('jersey_number')}
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
                onValueChange={(v) =>
                  setValue('batting_style', (v || null) as PlayerFormData['batting_style'])
                }
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  {battingStyles.map((style) => (
                    <SelectItem key={style} value={style} className="text-white">
                      {style
                        .split('-')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Bowling Style</Label>
              <Select
                value={watch('bowling_style') ?? ''}
                onValueChange={(v) =>
                  setValue('bowling_style', (v || null) as PlayerFormData['bowling_style'])
                }
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  {bowlingStyles.map((style) => (
                    <SelectItem key={style} value={style} className="text-white">
                      {style
                        .split('-')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
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
              {errors.base_price && (
                <p className="text-sm text-red-400">{errors.base_price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Category</Label>
              <Input {...register('category')} className="border-slate-700 bg-slate-800 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Previous Team</Label>
            <Input
              {...register('previous_team')}
              className="border-slate-700 bg-slate-800 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Bio</Label>
            <Textarea
              {...register('bio')}
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
