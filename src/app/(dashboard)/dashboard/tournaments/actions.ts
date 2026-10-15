'use server';

import { createClient } from '@/lib/supabase/server';
import {
  ORGANIZER_ROLES,
  requireServiceGrant,
  requireTournamentRole,
  requireVerifiedUser,
  getUserTournamentRole,
} from '@/lib/auth/permissions';
import {
  assignTournamentRole,
  ensurePersonForAuthUser,
  revokeTournamentRole,
  upsertPersonByContact,
} from '@/lib/auth/person';
import {
  tournamentSchema,
  TournamentFormData,
  tournamentSettingsSchema,
  TournamentSettingsData,
  tournamentStaffInviteSchema,
} from '@/lib/validation/schemas';
import type { TournamentMemberRole } from '@/types/database';
import { randomBrandColors } from '@/lib/ui/colors';
import { revalidatePath } from 'next/cache';

export async function createTournament(data: TournamentFormData) {
  const user = await requireVerifiedUser();
  await requireServiceGrant('tournaments', 'write');
  const validated = tournamentSchema.parse(data);
  const colors = randomBrandColors(validated.name);

  const supabase = await createClient();

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      ...validated,
      primary_color: validated.primary_color ?? colors.primary_color,
      secondary_color: validated.secondary_color ?? colors.secondary_color,
      starts_at: validated.starts_at || null,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const personResult = await ensurePersonForAuthUser(user);
  if ('error' in personResult) {
    return { error: personResult.error };
  }

  const assigned = await assignTournamentRole({
    tournamentId: tournament.id,
    personId: personResult.person.id,
    role: 'organizer',
    grantedByPersonId: personResult.person.id,
  });
  if ('error' in assigned) {
    return { error: assigned.error };
  }

  revalidatePath('/dashboard');
  return { success: true, tournamentId: tournament.id };
}

export async function updateTournament(
  tournamentId: string,
  data: Partial<TournamentFormData>
) {
  await requireVerifiedUser();
  await requireServiceGrant('tournaments', 'write');
  await requireTournamentRole(tournamentId, ORGANIZER_ROLES);
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

export async function updateTournamentSettings(
  tournamentId: string,
  raw: TournamentSettingsData
) {
  await requireVerifiedUser();
  await requireServiceGrant('tournaments', 'write');
  await requireTournamentRole(tournamentId, ORGANIZER_ROLES);

  const validated = tournamentSettingsSchema.parse(raw);
  const supabase = await createClient();

  const { error } = await supabase
    .from('tournaments')
    .update({
      access_mode: validated.access_mode,
      viewers_can_see_purse: validated.viewers_can_see_purse,
      ...(validated.status ? { status: validated.status } : {}),
      ...(validated.location !== undefined ? { location: validated.location } : {}),
      ...(validated.starts_at !== undefined
        ? { starts_at: validated.starts_at || null }
        : {}),
      ...(validated.max_teams !== undefined ? { max_teams: validated.max_teams } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tournamentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath('/dashboard/tournaments');
  return { success: true };
}

/** Authenticated user joins an open tournament as viewer. */
export async function joinOpenTournament(tournamentId: string) {
  const user = await requireVerifiedUser();
  await requireServiceGrant('tournaments', 'read');

  const supabase = await createClient();
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('id, access_mode')
    .eq('id', tournamentId)
    .single();

  if (error || !tournament) {
    return { error: 'Tournament not found' };
  }
  if (tournament.access_mode !== 'open') {
    return { error: 'This tournament is private — ask an organizer for an invite' };
  }

  const existing = await getUserTournamentRole(tournamentId);
  if (existing) {
    return { success: true, alreadyMember: true };
  }

  const personResult = await ensurePersonForAuthUser(user);
  if ('error' in personResult) {
    return { error: personResult.error };
  }

  const assigned = await assignTournamentRole({
    tournamentId,
    personId: personResult.person.id,
    role: 'viewer',
    grantedByPersonId: personResult.person.id,
  });
  if ('error' in assigned) {
    return { error: assigned.error };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath('/dashboard/tournaments');
  revalidatePath('/dashboard/me');
  return { success: true, alreadyMember: false };
}

/** Add a staff role by email — creates/reuses person without requiring prior signup. */
export async function inviteTournamentStaffByEmail(
  tournamentId: string,
  raw: {
    email: string;
    role: Exclude<TournamentMemberRole, 'admin'>;
    display_name?: string | null;
  }
) {
  const user = await requireVerifiedUser();
  await requireServiceGrant('tournaments', 'write');
  await requireTournamentRole(tournamentId, ORGANIZER_ROLES);

  const validated = tournamentStaffInviteSchema.parse(raw);
  const grantor = await ensurePersonForAuthUser(user);
  if ('error' in grantor) {
    return { error: grantor.error };
  }

  const personResult = await upsertPersonByContact({
    email: validated.email,
    displayName: validated.display_name || undefined,
  });
  if ('error' in personResult) {
    return { error: personResult.error };
  }

  const assigned = await assignTournamentRole({
    tournamentId,
    personId: personResult.person.id,
    role: validated.role,
    grantedByPersonId: grantor.person.id,
  });
  if ('error' in assigned) {
    return { error: assigned.error };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath('/dashboard/me');
  return {
    success: true,
    personId: personResult.person.id,
    claimed: personResult.person.claim_status === 'claimed',
  };
}

export async function revokeTournamentStaffRole(
  tournamentId: string,
  assignmentId: string
) {
  await requireVerifiedUser();
  await requireServiceGrant('tournaments', 'write');
  await requireTournamentRole(tournamentId, ORGANIZER_ROLES);

  const result = await revokeTournamentRole({ tournamentId, assignmentId });
  if ('error' in result) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath('/dashboard/me');
  return { success: true };
}

export async function listTournamentStaff(tournamentId: string) {
  await requireVerifiedUser();
  await requireTournamentRole(tournamentId, [
    ...ORGANIZER_ROLES,
    'operator',
    'team_manager',
    'scorer',
    'umpire',
    'viewer',
  ]);

  // Service role after authz — avoids embed/RLS gaps when listing unclaimed persons.
  const { createServiceClient } = await import('@/lib/supabase/server');
  const service = await createServiceClient();
  const { data, error } = await service
    .from('tournament_role_assignments')
    .select(
      'id, role, created_at, person_id, persons!tournament_role_assignments_person_id_fkey(id, display_name, primary_email, primary_phone, claim_status, auth_user_id)'
    )
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { staff: data ?? [] };
}
