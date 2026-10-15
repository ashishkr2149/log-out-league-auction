import { createServiceClient } from '@/lib/supabase/server';
import type { Person, TournamentMemberRole } from '@/types/database';

export const TOURNAMENT_ROLE_RANK: Record<TournamentMemberRole, number> = {
  admin: 60,
  organizer: 60,
  operator: 50,
  team_manager: 40,
  scorer: 30,
  umpire: 30,
  viewer: 10,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').trim();
}

export function isValidEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return e.length > 3 && e.includes('@') && !e.startsWith('@') && !e.endsWith('@');
}

type UpsertPersonInput = {
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  /** If set, prefer linking this auth user when claiming/creating. */
  authUserId?: string | null;
};

/**
 * Find or create a person by email (preferred) or phone.
 * Uses service role — call only after authz checks in the caller.
 */
export async function upsertPersonByContact(
  input: UpsertPersonInput
): Promise<{ person: Person } | { error: string }> {
  const email = input.email ? normalizeEmail(input.email) : null;
  const phone = input.phone ? normalizePhone(input.phone) : null;
  const displayName = (input.displayName ?? '').trim();

  if (!email && !phone && !input.authUserId) {
    return { error: 'Email or phone is required to register a person' };
  }
  if (email && !isValidEmail(email)) {
    return { error: 'Enter a valid email address' };
  }

  const service = await createServiceClient();

  let existing: Person | null = null;

  if (input.authUserId) {
    const { data } = await service
      .from('persons')
      .select('*')
      .eq('auth_user_id', input.authUserId)
      .maybeSingle();
    existing = data as Person | null;
  }

  if (!existing && email) {
    const { data } = await service
      .from('persons')
      .select('*')
      .eq('primary_email', email)
      .maybeSingle();
    existing = data as Person | null;
  }

  if (!existing && phone) {
    const { data } = await service
      .from('persons')
      .select('*')
      .eq('primary_phone', phone)
      .maybeSingle();
    existing = data as Person | null;
  }

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (displayName && !existing.display_name?.trim()) {
      patch.display_name = displayName;
    }
    if (email && !existing.primary_email) {
      patch.primary_email = email;
    }
    if (phone && !existing.primary_phone) {
      patch.primary_phone = phone;
    }
    if (
      input.authUserId &&
      !existing.auth_user_id &&
      existing.claim_status === 'unclaimed'
    ) {
      patch.auth_user_id = input.authUserId;
      patch.claim_status = 'claimed';
    }

    if (Object.keys(patch).length > 0) {
      const { data: updated, error } = await service
        .from('persons')
        .update(patch)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) return { error: error.message };
      return { person: updated as Person };
    }

    return { person: existing };
  }

  const { data: created, error } = await service
    .from('persons')
    .insert({
      display_name: displayName || (email ? email.split('@')[0] : 'Player'),
      primary_email: email,
      primary_phone: phone,
      auth_user_id: input.authUserId ?? null,
      claim_status: input.authUserId ? 'claimed' : 'unclaimed',
      is_player: true,
    })
    .select('*')
    .single();

  if (error) return { error: error.message };
  return { person: created as Person };
}

/** Ensure the signed-in user has a claimed person row (create or claim by email). */
export async function ensurePersonForAuthUser(user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<{ person: Person } | { error: string }> {
  const service = await createServiceClient();

  const { data: byAuth } = await service
    .from('persons')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (byAuth) {
    return { person: byAuth as Person };
  }

  const email = user.email ? normalizeEmail(user.email) : null;
  const metaName =
    (typeof user.user_metadata?.display_name === 'string' &&
      user.user_metadata.display_name) ||
    (typeof user.user_metadata?.full_name === 'string' &&
      user.user_metadata.full_name) ||
    '';

  if (email) {
    const { data: byEmail } = await service
      .from('persons')
      .select('*')
      .eq('primary_email', email)
      .maybeSingle();

    if (byEmail) {
      if (byEmail.auth_user_id && byEmail.auth_user_id !== user.id) {
        return {
          error:
            'This email is already linked to another account. Contact support.',
        };
      }

      const patch: Record<string, unknown> = {
        auth_user_id: user.id,
        claim_status: 'claimed',
        is_player: true,
      };
      if (!byEmail.display_name?.trim() && metaName) {
        patch.display_name = metaName.trim();
      }

      const { data: claimed, error } = await service
        .from('persons')
        .update(patch)
        .eq('id', byEmail.id)
        .select('*')
        .single();

      if (error) return { error: error.message };
      return { person: claimed as Person };
    }
  }

  return upsertPersonByContact({
    email,
    displayName: metaName || (email ? email.split('@')[0] : 'User'),
    authUserId: user.id,
  });
}

export async function getPersonIdForAuthUser(
  authUserId: string
): Promise<string | null> {
  const service = await createServiceClient();
  const { data } = await service
    .from('persons')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  return data?.id ?? null;
}

function highestRole(
  roles: TournamentMemberRole[]
): TournamentMemberRole | null {
  if (roles.length === 0) return null;
  return roles.reduce((best, role) =>
    TOURNAMENT_ROLE_RANK[role] > TOURNAMENT_ROLE_RANK[best] ? role : best
  );
}

/**
 * Assign a tournament staff role to a person. Dual-writes legacy tournament_members
 * for claimed users (highest role) for backward compatibility.
 */
export async function assignTournamentRole(opts: {
  tournamentId: string;
  personId: string;
  role: TournamentMemberRole;
  grantedByPersonId?: string | null;
}): Promise<{ success: true } | { error: string }> {
  const service = await createServiceClient();

  const { error: assignErr } = await service
    .from('tournament_role_assignments')
    .upsert(
      {
        tournament_id: opts.tournamentId,
        person_id: opts.personId,
        role: opts.role,
        granted_by_person_id: opts.grantedByPersonId ?? null,
      },
      { onConflict: 'tournament_id,person_id,role' }
    );

  if (assignErr) return { error: assignErr.message };

  const { data: person } = await service
    .from('persons')
    .select('auth_user_id')
    .eq('id', opts.personId)
    .maybeSingle();

  if (person?.auth_user_id) {
    const { data: allRoles } = await service
      .from('tournament_role_assignments')
      .select('role')
      .eq('tournament_id', opts.tournamentId)
      .eq('person_id', opts.personId);

    const roles = (allRoles ?? []).map((r) => r.role as TournamentMemberRole);
    const primary = highestRole(roles) ?? opts.role;

    const { data: existing } = await service
      .from('tournament_members')
      .select('id, role')
      .eq('tournament_id', opts.tournamentId)
      .eq('user_id', person.auth_user_id)
      .maybeSingle();

    if (existing) {
      if (
        TOURNAMENT_ROLE_RANK[primary] >
        TOURNAMENT_ROLE_RANK[existing.role as TournamentMemberRole]
      ) {
        await service
          .from('tournament_members')
          .update({ role: primary })
          .eq('id', existing.id);
      }
    } else {
      await service.from('tournament_members').insert({
        tournament_id: opts.tournamentId,
        user_id: person.auth_user_id,
        role: primary,
      });
    }
  }

  return { success: true };
}

/**
 * Remove a single tournament role assignment and sync legacy tournament_members.
 */
export async function revokeTournamentRole(opts: {
  tournamentId: string;
  assignmentId: string;
}): Promise<{ success: true } | { error: string }> {
  const service = await createServiceClient();

  const { data: assignment, error: fetchErr } = await service
    .from('tournament_role_assignments')
    .select('id, person_id, role, tournament_id')
    .eq('id', opts.assignmentId)
    .eq('tournament_id', opts.tournamentId)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr.message };
  if (!assignment) return { error: 'Role assignment not found' };

  const { error: delErr } = await service
    .from('tournament_role_assignments')
    .delete()
    .eq('id', assignment.id);

  if (delErr) return { error: delErr.message };

  const { data: person } = await service
    .from('persons')
    .select('auth_user_id')
    .eq('id', assignment.person_id)
    .maybeSingle();

  if (person?.auth_user_id) {
    const { data: remaining } = await service
      .from('tournament_role_assignments')
      .select('role')
      .eq('tournament_id', opts.tournamentId)
      .eq('person_id', assignment.person_id);

    const roles = (remaining ?? []).map((r) => r.role as TournamentMemberRole);
    const primary = highestRole(roles);

    if (!primary) {
      await service
        .from('tournament_members')
        .delete()
        .eq('tournament_id', opts.tournamentId)
        .eq('user_id', person.auth_user_id);
    } else {
      await service
        .from('tournament_members')
        .update({ role: primary })
        .eq('tournament_id', opts.tournamentId)
        .eq('user_id', person.auth_user_id);
    }
  }

  return { success: true };
}

export async function listPersonRoles(personId: string) {
  const service = await createServiceClient();
  const { data: assignments, error } = await service
    .from('tournament_role_assignments')
    .select(
      'id, role, tournament_id, created_at, tournaments!tournament_role_assignments_tournament_id_fkey(id, name, season, status)'
    )
    .eq('person_id', personId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };

  const { data: roster } = await service
    .from('players')
    .select('id, name, display_name, tournament_id, status, tournaments(id, name, season)')
    .eq('person_id', personId)
    .order('created_at', { ascending: false });

  return {
    assignments: assignments ?? [],
    roster: roster ?? [],
  };
}
