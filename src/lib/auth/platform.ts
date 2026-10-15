'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePlatformRole, requireVerifiedUser } from '@/lib/auth/permissions';
import { ensurePersonForAuthUser, upsertPersonByContact } from '@/lib/auth/person';
import type { PlatformServiceKey, PlatformStaffRole } from '@/types/database';

const DEFAULT_GRANTS: Record<
  PlatformStaffRole,
  Partial<Record<PlatformServiceKey, { can_read: boolean; can_write: boolean; can_admin: boolean }>>
> = {
  owner: {},
  admin: {
    tournaments: { can_read: true, can_write: true, can_admin: true },
    auctions: { can_read: true, can_write: true, can_admin: true },
    overlays: { can_read: true, can_write: true, can_admin: true },
    matches: { can_read: true, can_write: true, can_admin: true },
    billing: { can_read: true, can_write: false, can_admin: false },
    users: { can_read: true, can_write: true, can_admin: true },
  },
  editor: {
    tournaments: { can_read: true, can_write: true, can_admin: false },
    auctions: { can_read: true, can_write: true, can_admin: false },
    overlays: { can_read: true, can_write: true, can_admin: false },
    matches: { can_read: true, can_write: true, can_admin: false },
    billing: { can_read: true, can_write: false, can_admin: false },
    users: { can_read: true, can_write: false, can_admin: false },
  },
  viewer: {
    tournaments: { can_read: true, can_write: false, can_admin: false },
    auctions: { can_read: true, can_write: false, can_admin: false },
    overlays: { can_read: true, can_write: false, can_admin: false },
    matches: { can_read: true, can_write: false, can_admin: false },
    billing: { can_read: true, can_write: false, can_admin: false },
    users: { can_read: true, can_write: false, can_admin: false },
  },
};

/** Bootstrap the first platform owner (no existing owners). */
export async function bootstrapPlatformOwner() {
  const user = await requireVerifiedUser();
  const service = await createServiceClient();

  const { count } = await service
    .from('platform_staff')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'owner');

  if ((count ?? 0) > 0) {
    return { error: 'A platform owner already exists' };
  }

  const personResult = await ensurePersonForAuthUser(user);
  if ('error' in personResult) {
    return { error: personResult.error };
  }

  const { error } = await service.from('platform_staff').insert({
    user_id: user.id,
    person_id: personResult.person.id,
    role: 'owner',
    invited_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function invitePlatformStaff(
  userId: string,
  role: Exclude<PlatformStaffRole, 'owner'>
) {
  const inviter = await requireVerifiedUser();
  await requirePlatformRole('owner');

  const service = await createServiceClient();

  const { data: authUser } = await service.auth.admin.getUserById(userId);
  const personResult = await upsertPersonByContact({
    email: authUser.user?.email ?? null,
    authUserId: userId,
    displayName:
      (typeof authUser.user?.user_metadata?.display_name === 'string' &&
        authUser.user.user_metadata.display_name) ||
      (typeof authUser.user?.user_metadata?.full_name === 'string' &&
        authUser.user.user_metadata.full_name) ||
      undefined,
  });
  if ('error' in personResult) {
    return { error: personResult.error };
  }

  const { data: staff, error } = await service
    .from('platform_staff')
    .insert({
      user_id: userId,
      person_id: personResult.person.id,
      role,
      invited_by: inviter.id,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'This user is already platform staff' };
    }
    return { error: error.message };
  }

  const grants = DEFAULT_GRANTS[role];
  const rows = Object.entries(grants).map(([service_key, caps]) => ({
    staff_id: staff.id,
    service_key,
    can_read: caps.can_read,
    can_write: caps.can_write,
    can_admin: caps.can_admin,
  }));

  if (rows.length > 0) {
    await service.from('platform_service_grants').insert(rows);
  }

  return { success: true, staffId: staff.id };
}

export async function updatePlatformStaffRole(
  staffId: string,
  role: Exclude<PlatformStaffRole, 'owner'>
) {
  await requireVerifiedUser();
  await requirePlatformRole('owner');
  const service = await createServiceClient();

  const { data: existing } = await service
    .from('platform_staff')
    .select('role')
    .eq('id', staffId)
    .maybeSingle();

  if (!existing) {
    return { error: 'Staff member not found' };
  }
  if (existing.role === 'owner') {
    return { error: 'Cannot change the platform owner role' };
  }

  const { error } = await service
    .from('platform_staff')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', staffId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function setPlatformServiceEnabled(
  serviceKey: PlatformServiceKey,
  isEnabled: boolean
) {
  const user = await requireVerifiedUser();
  await requirePlatformRole('owner');
  const supabase = await createClient();

  const { error } = await supabase
    .from('platform_services')
    .update({
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('service_key', serviceKey);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function removePlatformStaff(staffId: string) {
  await requireVerifiedUser();
  await requirePlatformRole('owner');
  const service = await createServiceClient();

  const { data: existing } = await service
    .from('platform_staff')
    .select('role')
    .eq('id', staffId)
    .maybeSingle();

  if (!existing) {
    return { error: 'Staff member not found' };
  }
  if (existing.role === 'owner') {
    return { error: 'Cannot remove the platform owner' };
  }

  const { error } = await service.from('platform_staff').delete().eq('id', staffId);
  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function invitePlatformStaffByEmail(
  email: string,
  role: Exclude<PlatformStaffRole, 'owner'>
) {
  await requireVerifiedUser();
  await requirePlatformRole('owner');

  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return { error: 'Enter a valid email address' };
  }

  const service = await createServiceClient();
  const { data: listed, error: listErr } = await service.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) {
    return { error: listErr.message };
  }

  const match = listed.users.find(
    (u) => (u.email || '').toLowerCase() === normalized
  );
  if (!match) {
    // Pre-register person for later claim; platform_staff still needs auth user.
    await upsertPersonByContact({ email: normalized });
    return {
      error:
        'No account with that email yet. They are registered as a person — ask them to sign up with this email, then invite again for platform staff.',
    };
  }

  const personResult = await upsertPersonByContact({
    email: normalized,
    authUserId: match.id,
    displayName:
      (typeof match.user_metadata?.display_name === 'string' &&
        match.user_metadata.display_name) ||
      undefined,
  });
  if ('error' in personResult) {
    return { error: personResult.error };
  }

  return invitePlatformStaff(match.id, role);
}

export async function listPlatformStaff() {
  await requireVerifiedUser();
  await requirePlatformRole('viewer');
  const service = await createServiceClient();

  const { data: staff, error } = await service
    .from('platform_staff')
    .select('id, user_id, role, invited_by, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) {
    return { error: error.message };
  }

  const { data: listed } = await service.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(
    (listed?.users ?? []).map((u) => [u.id, u.email ?? u.id])
  );

  return {
    success: true as const,
    staff: (staff ?? []).map((row) => ({
      ...row,
      email: emailById.get(row.user_id) ?? row.user_id,
    })),
  };
}

export async function listPlatformServices() {
  await requireVerifiedUser();
  await requirePlatformRole('viewer');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('platform_services')
    .select('service_key, is_enabled, updated_at')
    .order('service_key');

  if (error) {
    return { error: error.message };
  }

  return { success: true as const, services: data ?? [] };
}

export async function listPlatformServiceGrants() {
  await requireVerifiedUser();
  await requirePlatformRole('viewer');
  const service = await createServiceClient();

  const { data, error } = await service
    .from('platform_service_grants')
    .select('id, staff_id, service_key, can_read, can_write, can_admin')
    .order('service_key');

  if (error) {
    return { error: error.message };
  }

  return { success: true as const, grants: data ?? [] };
}

export async function setPlatformServiceGrant(opts: {
  staffId: string;
  serviceKey: PlatformServiceKey;
  can_read: boolean;
  can_write: boolean;
  can_admin: boolean;
}) {
  await requireVerifiedUser();
  await requirePlatformRole('owner');
  const service = await createServiceClient();

  const { data: staff } = await service
    .from('platform_staff')
    .select('id, role')
    .eq('id', opts.staffId)
    .maybeSingle();

  if (!staff) {
    return { error: 'Staff member not found' };
  }
  if (staff.role === 'owner') {
    return { error: 'Owner has full access — grants do not apply' };
  }

  const { error } = await service.from('platform_service_grants').upsert(
    {
      staff_id: opts.staffId,
      service_key: opts.serviceKey,
      can_read: opts.can_read,
      can_write: opts.can_write,
      can_admin: opts.can_admin,
    },
    { onConflict: 'staff_id,service_key' }
  );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getMyPlatformRoleAction() {
  const { getPlatformRole } = await import('@/lib/auth/permissions');
  const role = await getPlatformRole();
  return { role };
}
