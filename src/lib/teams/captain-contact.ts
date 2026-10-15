import { createServiceClient } from '@/lib/supabase/server';
import {
  ensurePersonForAuthUser,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
  upsertPersonByContact,
} from '@/lib/auth/person';
import { ensureTeamMembership } from '@/lib/teams/global';
import { ensureCaptainPlayer } from '@/lib/teams/captain';
import type { Person } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export type CaptainContactInput = {
  iAmCaptain?: boolean;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
};

/**
 * Resolve a captain person from self-checkbox or email/phone.
 * Creates an unclaimed person when contact is new (requires displayName).
 */
export async function resolveCaptainPerson(
  user: User,
  input: CaptainContactInput
): Promise<{ person: Person } | { error: string; needsName?: boolean }> {
  if (input.iAmCaptain) {
    const me = await ensurePersonForAuthUser(user);
    if ('error' in me) return { error: me.error };
    return { person: me.person };
  }

  const email = input.email?.trim() ? normalizeEmail(input.email) : null;
  const phone = input.phone?.trim() ? normalizePhone(input.phone) : null;

  if (!email && !phone) {
    return { error: 'Enter captain email or phone, or choose “I am the captain”' };
  }
  if (email && !isValidEmail(email)) {
    return { error: 'Enter a valid captain email' };
  }

  const service = await createServiceClient();
  let existing: Person | null = null;
  if (email) {
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
    return { person: existing };
  }

  const name = (input.displayName ?? '').trim();
  if (!name) {
    return {
      error: 'This person is not registered yet — enter their name to create them',
      needsName: true,
    };
  }

  const created = await upsertPersonByContact({
    email,
    phone,
    displayName: name,
  });
  if ('error' in created) return { error: created.error };
  return { person: created.person };
}

/** Ensure tournament captain player row + optional global membership. */
export async function applyCaptainToTournament(opts: {
  supabase: SupabaseClient;
  tournamentId: string;
  person: Person;
  globalTeamId?: string | null;
  /** When true, set membership role to captain (team create). */
  asGlobalCaptain?: boolean;
}): Promise<
  | { captainName: string; playerId: string; personId: string }
  | { error: string }
> {
  const captainName =
    opts.person.display_name?.trim() ||
    opts.person.primary_email?.split('@')[0] ||
    'Captain';

  const captain = await ensureCaptainPlayer(
    opts.supabase,
    opts.tournamentId,
    captainName
  );
  if ('error' in captain) return { error: captain.error };

  // Link tournament player row to person when possible
  const service = await createServiceClient();
  await service
    .from('players')
    .update({
      person_id: opts.person.id,
      contact_email: opts.person.primary_email,
      contact_phone: opts.person.primary_phone,
    })
    .eq('id', captain.playerId);

  if (opts.globalTeamId) {
    await ensureTeamMembership(
      opts.globalTeamId,
      opts.person.id,
      opts.asGlobalCaptain ? 'captain' : 'member'
    );
  }

  return {
    captainName: captain.captainName,
    playerId: captain.playerId,
    personId: opts.person.id,
  };
}
