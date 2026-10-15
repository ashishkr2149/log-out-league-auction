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
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground size-9 sm:size-auto sm:h-10 sm:px-4"
            aria-label="Add Player"
          />
        }
      >
        <Plus className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Add Player</span>
      </DialogTrigger>
      <DialogContent className="border-border bg-card max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Player</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a player to this tournament. Email links them to a platform identity they can claim later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Full Name *</Label>
              <Input
                {...register('name')}
                placeholder="Full name"
                className="border-border bg-muted text-foreground"
              />
              {errors.name && <p className="text-sm text-primary">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Display Name *</Label>
              <Input
                {...register('display_name')}
                placeholder="Short display name"
                className="border-border bg-muted text-foreground"
              />
              {errors.display_name && <p className="text-sm text-primary">{errors.display_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email (claimable)</Label>
              <Input
                type="email"
                {...register('contact_email')}
                placeholder="player@example.com"
                className="border-border bg-muted text-foreground"
              />
              {errors.contact_email && (
                <p className="text-sm text-primary">{errors.contact_email.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Registers them on the platform; they claim by signing up with this email.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Phone (optional)</Label>
              <Input
                {...register('contact_phone')}
                placeholder="+91…"
                className="border-border bg-muted text-foreground"
              />
              <p className="text-xs text-muted-foreground">Stored for future mobile OTP claim.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Jersey Number</Label>
              <Input
                {...register('jersey_number')}
                placeholder="e.g., 7"
                className="border-border bg-muted text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Role *</Label>
              <Select
                value={watch('role')}
                onValueChange={(v) => setValue('role', v as PlayerFormData['role'])}
              >
                <SelectTrigger className="border-border bg-muted text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-muted">
                  {playerRoles.map((role) => (
                    <SelectItem key={role} value={role} className="text-foreground">
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Batting Style</Label>
              <Select
                value={watch('batting_style') ?? ''}
                onValueChange={(v) => setValue('batting_style', v as PlayerFormData['batting_style'])}
              >
                <SelectTrigger className="border-border bg-muted text-foreground">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="border-border bg-muted">
                  {battingStyles.map((style) => (
                    <SelectItem key={style} value={style} className="text-foreground">
                      {style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Bowling Style</Label>
              <Select
                value={watch('bowling_style') ?? ''}
                onValueChange={(v) => setValue('bowling_style', v as PlayerFormData['bowling_style'])}
              >
                <SelectTrigger className="border-border bg-muted text-foreground">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="border-border bg-muted">
                  {bowlingStyles.map((style) => (
                    <SelectItem key={style} value={style} className="text-foreground">
                      {style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Base Price *</Label>
              <Input
                type="number"
                {...register('base_price', { valueAsNumber: true })}
                className="border-border bg-muted text-foreground"
              />
              {errors.base_price && <p className="text-sm text-primary">{errors.base_price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Category</Label>
              <Input
                {...register('category')}
                placeholder="e.g., A, B, C"
                className="border-border bg-muted text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Previous Team</Label>
            <Input
              {...register('previous_team')}
              placeholder="Previous team name"
              className="border-border bg-muted text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Bio</Label>
            <Textarea
              {...register('bio')}
              placeholder="Short bio..."
              rows={2}
              className="border-border bg-muted text-foreground"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Player
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
