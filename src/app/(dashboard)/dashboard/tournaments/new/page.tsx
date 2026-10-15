'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  tournamentSchema,
  TournamentFormData,
  matchTypes,
  accessModes,
} from '@/lib/validation/schemas';
import { createTournament } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { BackLink } from '@/components/shell/back-link';

const MATCH_TYPE_LABELS: Record<(typeof matchTypes)[number], string> = {
  tennis_ball: 'Tennis ball',
  leather_ball: 'Leather ball',
  box_cricket: 'Box cricket',
};

export default function NewTournamentPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      match_type: 'tennis_ball',
      access_mode: 'private',
      viewers_can_see_purse: false,
      location: '',
      max_teams: undefined,
    },
  });

  async function onSubmit(data: TournamentFormData) {
    setIsSubmitting(true);
    try {
      const result = await createTournament(data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Tournament created successfully');
      router.push(`/dashboard/tournaments/${result.tournamentId}`);
    } catch {
      toast.error('Failed to create tournament');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <BackLink fallbackHref="/dashboard/tournaments" />
        <div className="min-w-0">
          <h1 className="page-title">New Tournament</h1>
          <p className="mt-1 text-muted-foreground truncate">Create a new Log Out League tournament</p>
        </div>
      </div>

      <Card className="border-border bg-card max-w-2xl">
        <CardHeader>
          <CardTitle className="text-foreground">Tournament Details</CardTitle>
          <CardDescription className="text-muted-foreground">
            Set up the basic information for your tournament
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground">Tournament Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Log Out League Season 1"
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
              />
              {errors.name && (
                <p className="text-sm text-primary">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="season" className="text-muted-foreground">Season *</Label>
              <Input
                id="season"
                {...register('season')}
                placeholder="2024"
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
              />
              {errors.season && (
                <p className="text-sm text-primary">{errors.season.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-muted-foreground">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe your tournament..."
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Match format *</Label>
              <Select
                value={watch('match_type')}
                onValueChange={(v) =>
                  setValue('match_type', v as TournamentFormData['match_type'])
                }
              >
                <SelectTrigger className="border-border bg-muted text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-muted">
                  {matchTypes.map((t) => (
                    <SelectItem key={t} value={t} className="text-foreground">
                      {MATCH_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Stats stay separate for tennis ball, leather ball, and box cricket.
              </p>
              {errors.match_type && (
                <p className="text-sm text-primary">{errors.match_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Access *</Label>
              <Select
                value={watch('access_mode')}
                onValueChange={(v) =>
                  setValue('access_mode', v as TournamentFormData['access_mode'])
                }
              >
                <SelectTrigger className="border-border bg-muted text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-muted">
                  {accessModes.map((m) => (
                    <SelectItem key={m} value={m} className="text-foreground capitalize">
                      {m === 'open'
                        ? 'Open — discoverable, join as spectator'
                        : 'Private — invite only'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-muted-foreground">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="Ground / city"
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="starts_at" className="text-muted-foreground">Starts</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  {...register('starts_at')}
                  className="border-border bg-muted text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_teams" className="text-muted-foreground">Max teams</Label>
                <Input
                  id="max_teams"
                  type="number"
                  min={2}
                  placeholder="e.g. 8"
                  {...register('max_teams', {
                    setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                  })}
                  className="border-border bg-muted text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="viewers_can_see_purse"
                type="checkbox"
                className="h-4 w-4 rounded border-border bg-muted"
                checked={watch('viewers_can_see_purse')}
                onChange={(e) => setValue('viewers_can_see_purse', e.target.checked)}
              />
              <Label htmlFor="viewers_can_see_purse" className="text-muted-foreground">
                Allow spectators to see team purse
              </Label>
            </div>

            <p className="caption">
              Brand colors are assigned automatically — no need to pick them.
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Link href="/dashboard/tournaments" className="sm:w-auto">
                <Button type="button" variant="outline" className="w-full border-border text-muted-foreground">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground sm:flex-1"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Tournament
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
