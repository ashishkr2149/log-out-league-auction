'use server';

import { ensurePersonForAuthUser } from '@/lib/auth/person';
import { getCurrentUser } from '@/lib/auth/permissions';

/** Claim or create the person identity for the current session (email match). */
export async function claimPersonIdentity() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Not signed in' };
  }

  const result = await ensurePersonForAuthUser(user);
  if ('error' in result) {
    return { error: result.error };
  }

  return {
    success: true as const,
    personId: result.person.id,
    displayName: result.person.display_name,
    claimStatus: result.person.claim_status,
  };
}
