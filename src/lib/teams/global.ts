import { createServiceClient } from '@/lib/supabase/server';
import type { GlobalTeam, TeamMembershipRole } from '@/types/database';

export function makeQrSlug(shortName: string, seed?: string): string {
  const base = (shortName || 'team')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const suffix = (seed || cryptoRandom()).replace(/[^a-z0-9]/gi, '').slice(0, 8);
  return `${base || 'team'}-${suffix || 'x'}`;
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function createGlobalTeam(opts: {
  name: string;
  shortName: string;
  description?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  logoPath?: string | null;
  createdByPersonId: string | null;
  captainPersonId?: string | null;
}): Promise<{ team: GlobalTeam } | { error: string }> {
  const service = await createServiceClient();
  let slug = makeQrSlug(opts.shortName);
  for (let i = 0; i < 5; i++) {
    const { data, error } = await service
      .from('global_teams')
      .insert({
        name: opts.name.trim(),
        short_name: opts.shortName.trim(),
        description: opts.description ?? null,
        primary_color: opts.primaryColor ?? '#3498db',
        secondary_color: opts.secondaryColor ?? '#ffffff',
        logo_path: opts.logoPath ?? null,
        created_by_person_id: opts.createdByPersonId,
        qr_slug: slug,
      })
      .select('*')
      .single();

    if (!error && data) {
      if (opts.createdByPersonId) {
        await service.from('team_memberships').upsert(
          {
            global_team_id: data.id,
            person_id: opts.createdByPersonId,
            role: 'manager' satisfies TeamMembershipRole,
          },
          { onConflict: 'global_team_id,person_id' }
        );
      }
      if (opts.captainPersonId) {
        await service.from('team_memberships').upsert(
          {
            global_team_id: data.id,
            person_id: opts.captainPersonId,
            role: 'captain',
          },
          { onConflict: 'global_team_id,person_id' }
        );
      }
      return { team: data as GlobalTeam };
    }
    if (error?.code !== '23505') {
      return { error: error?.message ?? 'Failed to create global team' };
    }
    slug = makeQrSlug(opts.shortName);
  }
  return { error: 'Could not allocate a unique team QR slug' };
}

export async function ensureTeamMembership(
  globalTeamId: string,
  personId: string,
  role: TeamMembershipRole = 'member'
) {
  const service = await createServiceClient();
  const { data: existing } = await service
    .from('team_memberships')
    .select('id, role')
    .eq('global_team_id', globalTeamId)
    .eq('person_id', personId)
    .maybeSingle();

  if (existing) {
    const rank: Record<TeamMembershipRole, number> = {
      member: 1,
      captain: 3,
      manager: 2,
    };
    if (rank[role] > rank[existing.role as TeamMembershipRole]) {
      await service
        .from('team_memberships')
        .update({ role })
        .eq('id', existing.id);
    }
    return;
  }

  await service.from('team_memberships').insert({
    global_team_id: globalTeamId,
    person_id: personId,
    role,
  });
}

export async function searchGlobalTeams(query: string, limit = 20) {
  const service = await createServiceClient();
  const q = query.trim();
  let req = service
    .from('global_teams')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .limit(limit);

  if (q) {
    req = req.or(
      `name.ilike.%${q}%,short_name.ilike.%${q}%,description.ilike.%${q}%`
    );
  }

  const { data, error } = await req;
  if (error) return { error: error.message };
  return { teams: (data ?? []) as GlobalTeam[] };
}

export async function listMyGlobalTeams(personId: string) {
  const service = await createServiceClient();
  const { data: memberships, error } = await service
    .from('team_memberships')
    .select('role, global_teams(*)')
    .eq('person_id', personId);

  if (error) return { error: error.message };

  const { data: created } = await service
    .from('global_teams')
    .select('*')
    .eq('created_by_person_id', personId);

  const byId = new Map<string, GlobalTeam & { my_role?: string }>();
  for (const row of created ?? []) {
    byId.set(row.id, { ...(row as GlobalTeam), my_role: 'creator' });
  }
  for (const row of memberships ?? []) {
    const g = row.global_teams as GlobalTeam | GlobalTeam[] | null;
    const team = Array.isArray(g) ? g[0] : g;
    if (!team) continue;
    const prev = byId.get(team.id);
    byId.set(team.id, {
      ...team,
      my_role: prev?.my_role === 'creator' ? 'creator' : row.role,
    });
  }

  return { teams: Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)) };
}

export async function getGlobalTeamByQrSlug(slug: string) {
  const service = await createServiceClient();
  const { data, error } = await service
    .from('global_teams')
    .select('*')
    .eq('qr_slug', slug)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Team not found' };
  return { team: data as GlobalTeam };
}
