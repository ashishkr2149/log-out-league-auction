import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * Generate a high-entropy overlay token.
 * Returns both the raw token (to share with the user) and its hash (for storage).
 */
export function generateOverlayToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Hash an overlay token for lookup.
 */
export function hashOverlayToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new overlay credential for an auction.
 */
export async function createOverlayCredential(
  auctionId: string,
  label: string = 'default',
  expiresAt?: string | null
) {
  const serviceClient = await createServiceClient();
  const { token, hash } = generateOverlayToken();

  const { data, error } = await serviceClient
    .from('overlay_credentials')
    .insert({
      auction_id: auctionId,
      credential_hash: hash,
      label,
      is_active: true,
      expires_at: expiresAt ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create overlay credential: ${error.message}`);
  }

  return {
    id: data.id,
    token, // Return raw token only once
    label: data.label,
    created_at: data.created_at,
    expires_at: data.expires_at,
  };
}

/**
 * Validate an overlay token and return the associated auction ID.
 */
export async function validateOverlayToken(token: string): Promise<{
  valid: boolean;
  auctionId?: string;
  error?: string;
}> {
  const serviceClient = await createServiceClient();
  const hash = hashOverlayToken(token);

  const { data: credential, error } = await serviceClient
    .from('overlay_credentials')
    .select('auction_id, is_active, expires_at, revoked_at')
    .eq('credential_hash', hash)
    .single();

  if (error || !credential) {
    return { valid: false, error: 'Invalid overlay token' };
  }

  if (!credential.is_active || credential.revoked_at) {
    return { valid: false, error: 'Overlay credential has been revoked' };
  }

  if (credential.expires_at && new Date(credential.expires_at) < new Date()) {
    return { valid: false, error: 'Overlay credential has expired' };
  }

  return { valid: true, auctionId: credential.auction_id };
}

/**
 * Revoke an overlay credential.
 */
export async function revokeOverlayCredential(credentialId: string) {
  const serviceClient = await createServiceClient();

  const { error } = await serviceClient
    .from('overlay_credentials')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq('id', credentialId);

  if (error) {
    throw new Error(`Failed to revoke credential: ${error.message}`);
  }
}
