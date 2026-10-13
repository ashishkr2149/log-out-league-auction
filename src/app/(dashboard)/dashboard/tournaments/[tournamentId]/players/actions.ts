'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/permissions';
import { playerSchema, PlayerFormData, csvPlayerSchema } from '@/lib/validation/schemas';
import { revalidatePath } from 'next/cache';

export async function createPlayer(tournamentId: string, data: PlayerFormData) {
  await requireUser();
  const validated = playerSchema.parse(data);
  const supabase = await createClient();

  const { data: player, error } = await supabase
    .from('players')
    .insert({
      ...validated,
      tournament_id: tournamentId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/players`);
  return { success: true, playerId: player.id };
}

export async function updatePlayer(playerId: string, tournamentId: string, data: Partial<PlayerFormData>) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('players')
    .update(data)
    .eq('id', playerId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/players`);
  return { success: true };
}

export async function deletePlayer(playerId: string, tournamentId: string) {
  await requireUser();
  const supabase = await createClient();

  // Check if player is in any auction
  const { count } = await supabase
    .from('auction_players')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId);

  if ((count ?? 0) > 0) {
    return { error: 'Cannot delete a player that has been in an auction. Withdraw them instead.' };
  }

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/players`);
  return { success: true };
}

export async function importPlayersFromCSV(
  tournamentId: string,
  rows: Record<string, unknown>[]
) {
  await requireUser();
  const supabase = await createClient();

  const errors: { row: number; errors: string[] }[] = [];
  const validPlayers: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const validated = csvPlayerSchema.parse(rows[i]);
      validPlayers.push({
        tournament_id: tournamentId,
        name: validated.name,
        display_name: validated.display_name || validated.name,
        jersey_number: validated.jersey_number || null,
        role: validated.role,
        batting_style: validated.batting_style || null,
        bowling_style: validated.bowling_style || null,
        base_price: validated.base_price,
        category: validated.category || null,
        bio: validated.bio || null,
        previous_team: validated.previous_team || null,
        status: 'registered',
      });
    } catch (err) {
      errors.push({
        row: i + 1,
        errors: err instanceof Error ? [err.message] : ['Invalid data'],
      });
    }
  }

  if (errors.length > 0) {
    return { error: 'Some rows have validation errors', validationErrors: errors, validCount: validPlayers.length };
  }

  if (validPlayers.length === 0) {
    return { error: 'No valid players to import' };
  }

  // Check for duplicates by name within the same tournament
  const names = validPlayers.map((p) => p.name as string);
  const { data: existingPlayers } = await supabase
    .from('players')
    .select('name')
    .eq('tournament_id', tournamentId)
    .in('name', names);

  const duplicateNames = new Set((existingPlayers ?? []).map((p) => p.name));
  const newPlayers = validPlayers.filter((p) => !duplicateNames.has(p.name as string));
  const skipped = validPlayers.length - newPlayers.length;

  if (newPlayers.length === 0) {
    return { error: 'All players already exist in this tournament' };
  }

  const { error: insertError } = await supabase
    .from('players')
    .insert(newPlayers);

  if (insertError) {
    return { error: `Import failed: ${insertError.message}` };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/players`);
  return {
    success: true,
    imported: newPlayers.length,
    skipped,
    total: rows.length,
  };
}
