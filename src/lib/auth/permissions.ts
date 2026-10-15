import { createClient } from '@/lib/supabase/server';
import { ensurePersonForAuthUser, getPersonIdForAuthUser } from '@/lib/auth/person';
import type { PlatformStaffRole, TournamentMemberRole } from '@/types/database';

/** Organizer roles (legacy `admin` kept for unmigrated rows). */
export const ORGANIZER_ROLES: TournamentMemberRole[] = ['admin', 'organizer'];

/** Roles that may run a live auction (plus auction_operator_assignments). */
export const AUCTION_OPERATOR_TOURNAMENT_ROLES: TournamentMemberRole[] = [
  'admin',
  'organizer',
];

/** Roles that may create/revoke overlay credentials. */
export const OVERLAY_MANAGER_ROLES: TournamentMemberRole[] = [
  'admin',
  'organizer',
  'operator',
];

/** Roles that may edit teams/players. */
export const TEAM_MANAGER_ROLES: TournamentMemberRole[] = [
  'admin',
  'organizer',
  'team_manager',
];

/** Staff roles that can be assigned via person identity (excludes legacy admin). */
export const ASSIGNABLE_TOURNAMENT_ROLES: TournamentMemberRole[] = [
  'organizer',
  'operator',
  'scorer',
  'umpire',
  'team_manager',
  'viewer',
];

const ROLE_RANK: Record<TournamentMemberRole, number> = {
  admin: 60,
  organizer: 60,
  operator: 50,
  team_manager: 40,
  scorer: 30,
  umpire: 30,
  viewer: 10,
};

export const PLATFORM_ROLE_RANK: Record<PlatformStaffRole, number> = {
  owner: 40,
  admin: 30,
  editor: 20,
  viewer: 10,
};

export function hasMinimumPlatformRole(
  role: PlatformStaffRole | null | undefined,
  minimum: PlatformStaffRole
): boolean {
  if (!role) return false;
  return PLATFORM_ROLE_RANK[role] >= PLATFORM_ROLE_RANK[minimum];
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/** Require a signed-in user whose email has been verified. */
export async function requireVerifiedUser() {
  const user = await requireUser();
  if (!user.email_confirmed_at) {
    throw new Error('Email verification required before creating content');
  }
  // Claim / create person identity for verified users
  await ensurePersonForAuthUser(user);
  return user;
}

export function isEmailVerified(user: { email_confirmed_at?: string | null }) {
  return Boolean(user.email_confirmed_at);
}

export async function getUserTournamentRoles(
  tournamentId: string
): Promise<TournamentMemberRole[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const roles = new Set<TournamentMemberRole>();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('created_by')
    .eq('id', tournamentId)
    .single();

  if (tournament?.created_by === user.id) {
    roles.add('organizer');
  }

  let personId = await getPersonIdForAuthUser(user.id);
  if (!personId) {
    const ensured = await ensurePersonForAuthUser(user);
    if ('person' in ensured) personId = ensured.person.id;
  }
  if (personId) {
    const { data: assignments } = await supabase
      .from('tournament_role_assignments')
      .select('role')
      .eq('tournament_id', tournamentId)
      .eq('person_id', personId);

    for (const row of assignments ?? []) {
      roles.add(row.role as TournamentMemberRole);
    }
  }

  // Legacy fallback
  const { data: member } = await supabase
    .from('tournament_members')
    .select('role')
    .eq('tournament_id', tournamentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (member?.role) {
    roles.add(member.role as TournamentMemberRole);
  }

  return Array.from(roles);
}

/** Highest-privilege role for the user on this tournament (null if none). */
export async function getUserTournamentRole(
  tournamentId: string
): Promise<TournamentMemberRole | null> {
  const roles = await getUserTournamentRoles(tournamentId);
  if (roles.length === 0) return null;
  return roles.reduce((best, role) =>
    ROLE_RANK[role] > ROLE_RANK[best] ? role : best
  );
}

export async function requireTournamentRole(
  tournamentId: string,
  requiredRoles: TournamentMemberRole[]
): Promise<TournamentMemberRole> {
  await requireUser();
  const role = await getUserTournamentRole(tournamentId);
  if (!role || !requiredRoles.includes(role)) {
    throw new Error('Insufficient permissions');
  }
  return role;
}

export async function getAuctionTournamentId(
  auctionId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data: auction } = await supabase
    .from('auctions')
    .select('tournament_id')
    .eq('id', auctionId)
    .single();
  return auction?.tournament_id ?? null;
}

export async function isAuctionOperator(auctionId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from('auction_operator_assignments')
    .select('id')
    .eq('auction_id', auctionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (assignment) return true;

  const tournamentId = await getAuctionTournamentId(auctionId);
  if (!tournamentId) return false;

  const role = await getUserTournamentRole(tournamentId);
  return role !== null && AUCTION_OPERATOR_TOURNAMENT_ROLES.includes(role);
}

export async function requireAuctionOperator(auctionId: string) {
  await requireUser();
  const isOperator = await isAuctionOperator(auctionId);
  if (!isOperator) {
    throw new Error('Must be an auction operator');
  }
}

export async function requireOverlayManager(auctionId: string) {
  await requireUser();
  const tournamentId = await getAuctionTournamentId(auctionId);
  if (!tournamentId) {
    throw new Error('Auction not found');
  }

  if (await isAuctionOperator(auctionId)) return;

  const role = await getUserTournamentRole(tournamentId);
  if (!role || !OVERLAY_MANAGER_ROLES.includes(role)) {
    throw new Error('Insufficient permissions to manage overlay links');
  }
}

export async function getPlatformRole(): Promise<PlatformStaffRole | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('platform_staff')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return (data?.role as PlatformStaffRole) ?? null;
}

export async function requirePlatformRole(minimum: PlatformStaffRole) {
  await requireUser();
  const role = await getPlatformRole();
  if (!hasMinimumPlatformRole(role, minimum)) {
    throw new Error('Insufficient platform permissions');
  }
  return role;
}

export async function isServiceEnabled(serviceKey: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('platform_services')
    .select('is_enabled')
    .eq('service_key', serviceKey)
    .maybeSingle();

  // Missing row = enabled (fail open for local/dev before migration)
  if (!data) return true;
  return data.is_enabled !== false;
}

export async function requireServiceEnabled(serviceKey: string) {
  const enabled = await isServiceEnabled(serviceKey);
  if (!enabled) {
    throw new Error(`Service "${serviceKey}" is currently disabled`);
  }
}

export type ServiceCapability = 'read' | 'write' | 'admin';

/**
 * Pure helper: whether a tournament role may see purse amounts given the
 * tournament's viewers_can_see_purse flag.
 */
export function canSeePurseForRole(
  role: TournamentMemberRole | null | undefined,
  viewersCanSeePurse: boolean
): boolean {
  if (!role) return false;
  if (role === 'viewer') return viewersCanSeePurse;
  return true;
}

/**
 * Platform staff (non-owner) need a matching grant. Owners and non-staff pass.
 * Always pairs with kill-switch via requireServiceEnabled.
 */
export async function hasServiceGrant(
  serviceKey: string,
  capability: ServiceCapability
): Promise<boolean> {
  const role = await getPlatformRole();
  if (!role) return true;
  if (role === 'owner') return true;

  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from('platform_staff')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!staff) return true;

  const { data: grant } = await supabase
    .from('platform_service_grants')
    .select('can_read, can_write, can_admin')
    .eq('staff_id', staff.id)
    .eq('service_key', serviceKey)
    .maybeSingle();

  if (!grant) return false;

  if (capability === 'admin') return grant.can_admin === true;
  if (capability === 'write') return grant.can_write === true || grant.can_admin === true;
  return grant.can_read === true || grant.can_write === true || grant.can_admin === true;
}

/** Kill-switch + platform service grant (write by default). */
export async function requireServiceGrant(
  serviceKey: string,
  capability: ServiceCapability = 'write'
) {
  await requireServiceEnabled(serviceKey);
  const ok = await hasServiceGrant(serviceKey, capability);
  if (!ok) {
    throw new Error(
      `Missing ${capability} grant for service "${serviceKey}"`
    );
  }
}

/** Whether the current user may see purse amounts for this tournament. */
export async function canSeeTournamentPurse(
  tournamentId: string
): Promise<boolean> {
  const role = await getUserTournamentRole(tournamentId);
  if (!role) return false;
  if (role !== 'viewer') return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from('tournaments')
    .select('viewers_can_see_purse')
    .eq('id', tournamentId)
    .maybeSingle();

  return canSeePurseForRole(role, data?.viewers_can_see_purse === true);
}
