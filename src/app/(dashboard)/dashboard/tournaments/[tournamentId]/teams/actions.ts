'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/permissions';
import { teamSchema, TeamFormData } from '@/lib/validation/schemas';
import { revalidatePath } from 'next/cache';

export async function createTeam(tournamentId: string, data: TeamFormData) {
  await requireUser();
  const validated = teamSchema.parse(data);
  const supabase = await createClient();

  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      ...validated,
      tournament_id: tournamentId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'A team with this name already exists in this tournament' };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  return { success: true, teamId: team.id };
}

export async function updateTeam(teamId: string, tournamentId: string, data: TeamFormData) {
  await requireUser();
  const validated = teamSchema.parse(data);
  const supabase = await createClient();

  const { error } = await supabase
    .from('teams')
    .update(validated)
    .eq('id', teamId)
    .eq('tournament_id', tournamentId);

  if (error) {
    if (error.code === '23505') {
      return { error: 'A team with this name already exists in this tournament' };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  return { success: true };
}

export async function toggleTeamActive(teamId: string, tournamentId: string, isActive: boolean) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('teams')
    .update({ is_active: isActive })
    .eq('id', teamId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  return { success: true };
}
