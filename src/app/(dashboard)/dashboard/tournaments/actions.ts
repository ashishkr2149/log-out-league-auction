'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/permissions';
import { tournamentSchema, TournamentFormData } from '@/lib/validation/schemas';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createTournament(data: TournamentFormData) {
  const user = await requireUser();
  const validated = tournamentSchema.parse(data);

  const supabase = await createClient();

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      ...validated,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Add creator as admin member
  await supabase.from('tournament_members').insert({
    tournament_id: tournament.id,
    user_id: user.id,
    role: 'admin',
  });

  revalidatePath('/dashboard');
  return { success: true, tournamentId: tournament.id };
}

export async function updateTournament(tournamentId: string, data: Partial<TournamentFormData>) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('tournaments')
    .update(data)
    .eq('id', tournamentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  return { success: true };
}
