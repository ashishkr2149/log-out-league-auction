'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  TEAM_MANAGER_ROLES,
  requireServiceGrant,
  requireTournamentRole,
  requireVerifiedUser,
} from '@/lib/auth/permissions';
import { upsertPersonByContact } from '@/lib/auth/person';
import { playerSchema, PlayerFormData, csvPlayerSchema } from '@/lib/validation/schemas';
import { revalidatePath } from 'next/cache';

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export async function createPlayer(tournamentId: string, data: PlayerFormData) {
  await requireVerifiedUser();
  await requireServiceGrant('tournaments');
  await requireTournamentRole(tournamentId, TEAM_MANAGER_ROLES);
  const validated = playerSchema.parse(data);
  const supabase = await createClient();

  const contactEmail = emptyToNull(validated.contact_email);
  const contactPhone = emptyToNull(validated.contact_phone);

  let personId: string | null = null;
  if (contactEmail || contactPhone) {
    const result = await upsertPersonByContact({
      email: contactEmail,
      phone: contactPhone,
      displayName: validated.name,
    });
    if ('error' in result) {
      return { error: result.error };
    }
    personId = result.person.id;
  }

  const { contact_email: _e, contact_phone: _p, ...playerFields } = validated;

  const { data: player, error } = await supabase
    .from('players')
    .insert({
      ...playerFields,
      tournament_id: tournamentId,
      person_id: personId,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/players`);
  return { success: true, playerId: player.id, personId };
}

export async function updatePlayer(
  playerId: string,
  tournamentId: string,
  data: Partial<PlayerFormData>
) {
  await requireVerifiedUser();
  await requireServiceGrant('tournaments');
  await requireTournamentRole(tournamentId, TEAM_MANAGER_ROLES);
  const supabase = await createClient();
  const service = await createServiceClient();

  const contactEmail =
    data.contact_email !== undefined ? emptyToNull(data.contact_email) : undefined;
  const contactPhone =
    data.contact_phone !== undefined ? emptyToNull(data.contact_phone) : undefined;

  const patch: Record<string, unknown> = { ...data };
  delete patch.contact_email;
  delete patch.contact_phone;

  if (contactEmail !== undefined || contactPhone !== undefined) {
    const { data: existing } = await service
      .from('players')
      .select('person_id, name, contact_email, contact_phone')
      .eq('id', playerId)
      .single();

    const email = contactEmail !== undefined ? contactEmail : existing?.contact_email;
    const phone = contactPhone !== undefined ? contactPhone : existing?.contact_phone;

    if (email || phone) {
      const result = await upsertPersonByContact({
        email,
        phone,
        displayName: (data.name as string | undefined) ?? existing?.name ?? undefined,
      });
      if ('error' in result) {
        return { error: result.error };
      }
      patch.person_id = result.person.id;
    }

    if (contactEmail !== undefined) patch.contact_email = contactEmail;
    if (contactPhone !== undefined) patch.contact_phone = contactPhone;
  }

  const { error } = await supabase.from('players').update(patch).eq('id', playerId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/players`);
  return { success: true };
}

export async function deletePlayer(playerId: string, tournamentId: string) {
  await requireVerifiedUser();
  await requireServiceGrant('tournaments');
  await requireTournamentRole(tournamentId, TEAM_MANAGER_ROLES);
  const supabase = await createClient();

  const { data: captainTeam } = await supabase
    .from('teams')
    .select('id, name')
    .eq('tournament_id', tournamentId)
    .eq('captain_player_id', playerId)
    .maybeSingle();

  if (captainTeam) {
    return {
      error: `Cannot delete ${captainTeam.name}'s captain. Change the captain first.`,
    };
  }

  const { count } = await supabase
    .from('auction_players')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId);

  if ((count ?? 0) > 0) {
    return { error: 'Cannot delete a player that has been in an auction. Withdraw them instead.' };
  }

  const { error } = await supabase.from('players').delete().eq('id', playerId);

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
  await requireVerifiedUser();
  await requireServiceGrant('tournaments');
  await requireTournamentRole(tournamentId, TEAM_MANAGER_ROLES);
  const supabase = await createClient();

  const errors: { row: number; errors: string[] }[] = [];
  const validPlayers: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const validated = csvPlayerSchema.parse(rows[i]);
      const contactEmail = emptyToNull(
        validated.contact_email || validated.email || null
      );
      const contactPhone = emptyToNull(
        validated.contact_phone || validated.phone || null
      );

      let personId: string | null = null;
      if (contactEmail || contactPhone) {
        const result = await upsertPersonByContact({
          email: contactEmail,
          phone: contactPhone,
          displayName: validated.name,
        });
        if ('error' in result) {
          errors.push({ row: i + 1, errors: [result.error] });
          continue;
        }
        personId = result.person.id;
      }

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
        person_id: personId,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      });
    } catch (err) {
      errors.push({
        row: i + 1,
        errors: err instanceof Error ? [err.message] : ['Invalid data'],
      });
    }
  }

  if (errors.length > 0) {
    return {
      error: 'Some rows have validation errors',
      validationErrors: errors,
      validCount: validPlayers.length,
    };
  }

  if (validPlayers.length === 0) {
    return { error: 'No valid players to import' };
  }

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

  const { error: insertError } = await supabase.from('players').insert(newPlayers);

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
