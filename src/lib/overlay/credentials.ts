import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const DEFAULT_OVERLAY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

export function defaultOverlayExpiresAt(from: Date = new Date()): string {
  return new Date(from.getTime() + DEFAULT_OVERLAY_TTL_MS).toISOString();
}

/**
 * Create a new overlay credential for an auction.
 * Default expiry is 30 days unless an explicit expiresAt is provided.
 */
export async function createOverlayCredential(
  auctionId: string,
  label: string = 'default',
  options?: {
    expiresAt?: string | null;
    createdBy?: string | null;
  }
) {
  const serviceClient = await createServiceClient();
  const { token, hash } = generateOverlayToken();

  const expiresAt =
    options?.expiresAt === undefined
      ? defaultOverlayExpiresAt()
      : options.expiresAt;

  const { data, error } = await serviceClient
    .from('overlay_credentials')
    .insert({
      auction_id: auctionId,
      credential_hash: hash,
      label,
      is_active: true,
      expires_at: expiresAt,
      created_by: options?.createdBy ?? null,
    })
    .select('id, label, created_at, expires_at, created_by')
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
    created_by: data.created_by,
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
 * Revoke an overlay credential (audited).
 */
export async function revokeOverlayCredential(
  credentialId: string,
  revokedBy?: string | null
) {
  const serviceClient = await createServiceClient();

  const { error } = await serviceClient
    .from('overlay_credentials')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy ?? null,
    })
    .eq('id', credentialId);

  if (error) {
    throw new Error(`Failed to revoke credential: ${error.message}`);
  }
}

/**
 * List overlay credentials for an auction (no raw tokens).
 */
export async function listOverlayCredentials(auctionId: string) {
  const serviceClient = await createServiceClient();

  const { data, error } = await serviceClient
    .from('overlay_credentials')
    .select(
      'id, label, is_active, expires_at, created_at, created_by, revoked_at, revoked_by'
    )
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list overlay credentials: ${error.message}`);
  }

  return data ?? [];
}
