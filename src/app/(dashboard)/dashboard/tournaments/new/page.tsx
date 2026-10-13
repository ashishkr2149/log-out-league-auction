'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tournamentSchema, TournamentFormData } from '@/lib/validation/schemas';
import { createTournament } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewTournamentPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      primary_color: '#1a1a2e',
      secondary_color: '#e94560',
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
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tournaments">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">New Tournament</h1>
          <p className="mt-1 text-slate-400">Create a new Log Out League tournament</p>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Tournament Details</CardTitle>
          <CardDescription className="text-slate-400">
            Set up the basic information for your tournament
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Tournament Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Log Out League Season 1"
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
              {errors.name && (
                <p className="text-sm text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="season" className="text-slate-300">Season *</Label>
              <Input
                id="season"
                {...register('season')}
                placeholder="2024"
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
              {errors.season && (
                <p className="text-sm text-red-400">{errors.season.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe your tournament..."
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color" className="text-slate-300">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="primary_color"
                    type="color"
                    {...register('primary_color')}
                    className="h-10 w-14 border-slate-700 bg-slate-800 cursor-pointer p-1"
                  />
                  <Input
                    {...register('primary_color')}
                    className="border-slate-700 bg-slate-800 text-white font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color" className="text-slate-300">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="secondary_color"
                    type="color"
                    {...register('secondary_color')}
                    className="h-10 w-14 border-slate-700 bg-slate-800 cursor-pointer p-1"
                  />
                  <Input
                    {...register('secondary_color')}
                    className="border-slate-700 bg-slate-800 text-white font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Tournament
              </Button>
              <Link href="/dashboard/tournaments">
                <Button type="button" variant="outline" className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
