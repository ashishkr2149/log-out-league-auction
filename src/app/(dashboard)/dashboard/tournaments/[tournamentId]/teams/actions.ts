'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  ORGANIZER_ROLES,
  TEAM_MANAGER_ROLES,
  requireServiceGrant,
  requireTournamentRole,
  requireVerifiedUser,
} from '@/lib/auth/permissions';
import {
  ensurePersonForAuthUser,
  upsertPersonByContact,
} from '@/lib/auth/person';
import { createNotification } from '@/lib/notifications';
import {
  applyCaptainToTournament,
  resolveCaptainPerson,
  type CaptainContactInput,
} from '@/lib/teams/captain-contact';
import { ensureCaptainPlayer } from '@/lib/teams/captain';
import {
  createGlobalTeam,
  ensureTeamMembership,
  listMyGlobalTeams,
  searchGlobalTeams,
} from '@/lib/teams/global';
import { teamSchema, TeamFormData } from '@/lib/validation/schemas';
import { revalidatePath } from 'next/cache';

async function assertNotAlreadyEntered(
  tournamentId: string,
  globalTeamId: string
): Promise<string | null> {
  const service = await createServiceClient();
  const { data } = await service
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('global_team_id', globalTeamId)
    .maybeSingle();
  return data ? 'This team is already entered in this tournament' : null;
}

export type CreateTeamWithCaptainInput = TeamFormData & CaptainContactInput;

/** Create a brand-new global team and enter it into the tournament. */
export async function createTeam(
  tournamentId: string,
  data: CreateTeamWithCaptainInput
) {
  const user = await requireVerifiedUser();
  await requireServiceGrant('tournaments');
  await requireTournamentRole(tournamentId, TEAM_MANAGER_ROLES);
  const validated = teamSchema.parse(data);
  const supabase = await createClient();

  const me = await ensurePersonForAuthUser(user);
  if ('error' in me) return { error: me.error };

  const captainPerson = await resolveCaptainPerson(user, {
    iAmCaptain: data.iAmCaptain,
    email: data.email,
    phone: data.phone,
    displayName: data.displayName,
  });
  if ('error' in captainPerson) {
    return {
      error: captainPerson.error,
      needsName: captainPerson.needsName,
    };
  }

  const { randomBrandColors } = await import('@/lib/ui/colors');
  const colors = randomBrandColors(validated.name);
  const global = await createGlobalTeam({
    name: validated.name,
    shortName: validated.short_name,
    primaryColor: validated.primary_color ?? colors.primary_color,
    secondaryColor: validated.secondary_color ?? colors.secondary_color,
    createdByPersonId: me.person.id,
    captainPersonId: captainPerson.person.id,
  });
  if ('error' in global) return { error: global.error };

  const applied = await applyCaptainToTournament({
    supabase,
    tournamentId,
    person: captainPerson.person,
    globalTeamId: global.team.id,
    asGlobalCaptain: true,
  });
  if ('error' in applied) return { error: applied.error };

  const { captain_name: _c, primary_color, secondary_color, ...teamFields } = validated;

  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      ...teamFields,
      primary_color: primary_color ?? colors.primary_color,
      secondary_color: secondary_color ?? colors.secondary_color,
      captain_name: applied.captainName,
      captain_player_id: applied.playerId,
      captain_person_id: applied.personId,
      tournament_id: tournamentId,
      global_team_id: global.team.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'A team with this name already exists in this tournament' };
    }
    return { error: error.message };
  }

  if (!data.iAmCaptain && captainPerson.person.id !== me.person.id) {
    await createNotification({
      personId: captainPerson.person.id,
      type: 'global_captain_assigned',
      title: `You are captain of ${global.team.name}`,
      body: 'You were named captain of a new team. Open My Teams to manage it.',
      href: `/dashboard/teams/${global.team.id}`,
      payload: { global_team_id: global.team.id },
    });
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/players`);
  revalidatePath('/dashboard/teams');
  return {
    success: true,
    teamId: team.id,
    globalTeamId: global.team.id,
    qrSlug: global.team.qr_slug,
  };
}

async function enterGlobalTeamCore(opts: {
  tournamentId: string;
  globalTeamId: string;
  captainPersonId?: string | null;
  captainContact?: CaptainContactInput;
  user: Awaited<ReturnType<typeof requireVerifiedUser>>;
  initialPurse?: number;
  maxRosterSize?: number;
}) {
  const already = await assertNotAlreadyEntered(
    opts.tournamentId,
    opts.globalTeamId
  );
  if (already) return { error: already };

  const service = await createServiceClient();
  const { data: global, error: gErr } = await service
    .from('global_teams')
    .select('*')
    .eq('id', opts.globalTeamId)
    .single();
  if (gErr || !global) return { error: 'Global team not found' };

  const supabase = await createClient();

  let personId = opts.captainPersonId ?? null;
  if (!personId && opts.captainContact) {
    const resolved = await resolveCaptainPerson(opts.user, opts.captainContact);
    if ('error' in resolved) {
      return { error: resolved.error, needsName: resolved.needsName };
    }
    personId = resolved.person.id;
    const applied = await applyCaptainToTournament({
      supabase,
      tournamentId: opts.tournamentId,
      person: resolved.person,
      globalTeamId: opts.globalTeamId,
      asGlobalCaptain: false,
    });
    if ('error' in applied) return { error: applied.error };

    const { data: team, error } = await service
      .from('teams')
      .insert({
        tournament_id: opts.tournamentId,
        global_team_id: global.id,
        name: global.name,
        short_name: global.short_name || global.name.slice(0, 4).toUpperCase(),
        captain_name: applied.captainName,
        captain_player_id: applied.playerId,
        captain_person_id: applied.personId,
        logo_path: global.logo_path,
        primary_color: global.primary_color,
        secondary_color: global.secondary_color,
        initial_purse: opts.initialPurse ?? 100,
        max_roster_size: opts.maxRosterSize ?? 15,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: 'A team with this name already exists in this tournament' };
      }
      return { error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${opts.tournamentId}/teams`);
    return { success: true as const, teamId: team.id };
  }

  if (!personId) {
    return { error: 'Select a member as tournament captain or add one by email/phone' };
  }

  const { data: person } = await service
    .from('persons')
    .select('*')
    .eq('id', personId)
    .single();
  if (!person) return { error: 'Captain person not found' };

  const applied = await applyCaptainToTournament({
    supabase,
    tournamentId: opts.tournamentId,
    person,
    globalTeamId: opts.globalTeamId,
    asGlobalCaptain: false,
  });
  if ('error' in applied) return { error: applied.error };

  const { data: team, error } = await service
    .from('teams')
    .insert({
      tournament_id: opts.tournamentId,
      global_team_id: global.id,
      name: global.name,
      short_name: global.short_name || global.name.slice(0, 4).toUpperCase(),
      captain_name: applied.captainName,
      captain_player_id: applied.playerId,
      captain_person_id: applied.personId,
      logo_path: global.logo_path,
      primary_color: global.primary_color,
      secondary_color: global.secondary_color,
      initial_purse: opts.initialPurse ?? 100,
      max_roster_size: opts.maxRosterSize ?? 15,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'A team with this name already exists in this tournament' };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${opts.tournamentId}/teams`);
  return { success: true as const, teamId: team.id };
}

/** Enter an existing global team; tournament captain from member or new contact. */
export async function enterGlobalTeamInTournament(opts: {
  tournamentId: string;
  globalTeamId: string;
  captainPersonId?: string | null;
  captainContact?: CaptainContactInput;
  initialPurse?: number;
  maxRosterSize?: number;
}) {
  const user = await requireVerifiedUser();
  await requireServiceGrant('tournaments');
  await requireTournamentRole(opts.tournamentId, ORGANIZER_ROLES);
  return enterGlobalTeamCore({ ...opts, user });
}

export async function listGlobalTeamMembers(globalTeamId: string) {
  await requireVerifiedUser();
  const service = await createServiceClient();
  const { data, error } = await service
    .from('team_memberships')
    .select(
      'id, role, person_id, persons!team_memberships_person_id_fkey(id, display_name, primary_email, primary_phone, claim_status)'
    )
    .eq('global_team_id', globalTeamId)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };
  return { members: data ?? [] };
}

/** Invite a captain by email — they attach their team later via notification. */
export async function inviteCaptainByEmail(opts: {
  tournamentId: string;
  email: string;
  displayName?: string | null;
}) {
  const user = await requireVerifiedUser();
  await requireServiceGrant('tournaments');
  await requireTournamentRole(opts.tournamentId, ORGANIZER_ROLES);

  const grantor = await ensurePersonForAuthUser(user);
  if ('error' in grantor) return { error: grantor.error };

  const personResult = await upsertPersonByContact({
    email: opts.email,
    displayName: opts.displayName || undefined,
  });
  if ('error' in personResult) return { error: personResult.error };

  const service = await createServiceClient();
  const { data: invite, error } = await service
    .from('tournament_captain_invites')
    .upsert(
      {
        tournament_id: opts.tournamentId,
        person_id: personResult.person.id,
        invited_by_person_id: grantor.person.id,
        status: 'pending',
      },
      { onConflict: 'tournament_id,person_id' }
    )
    .select('*')
    .single();

  if (error) return { error: error.message };

  const { data: tournament } = await service
    .from('tournaments')
    .select('name')
    .eq('id', opts.tournamentId)
    .single();

  await createNotification({
    personId: personResult.person.id,
    type: 'captain_invite',
    title: `Captain invite: ${tournament?.name ?? 'Tournament'}`,
    body: 'You were named captain. Sign in and attach one of your teams (or create one).',
    href: `/dashboard/tournaments/${opts.tournamentId}/teams?invite=${invite.id}`,
    payload: {
      tournament_id: opts.tournamentId,
      invite_id: invite.id,
    },
  });

  revalidatePath(`/dashboard/tournaments/${opts.tournamentId}/teams`);
  revalidatePath('/dashboard/notifications');
  return {
    success: true,
    inviteId: invite.id,
    claimed: personResult.person.claim_status === 'claimed',
  };
}

export async function searchTeamsForEntry(query: string) {
  await requireVerifiedUser();
  return searchGlobalTeams(query, 25);
}

export async function getMyTeamsForEntry() {
  const user = await requireVerifiedUser();
  const me = await ensurePersonForAuthUser(user);
  if ('error' in me) return { error: me.error };
  return listMyGlobalTeams(me.person.id);
}

export async function updateTeam(
  teamId: string,
  tournamentId: string,
  data: TeamFormData
) {
  await requireVerifiedUser();
  await requireServiceGrant('tournaments');
  await requireTournamentRole(tournamentId, TEAM_MANAGER_ROLES);
  const validated = teamSchema.parse(data);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('teams')
    .select('captain_player_id, global_team_id, captain_name, primary_color, secondary_color')
    .eq('id', teamId)
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  const captainName =
    (validated.captain_name || existing?.captain_name || '').trim() || 'Captain';

  const captain = await ensureCaptainPlayer(
    supabase,
    tournamentId,
    captainName,
    existing?.captain_player_id
  );
  if ('error' in captain) {
    return { error: captain.error };
  }

  const { captain_name: _cn, primary_color, secondary_color, ...rest } = validated;

  const { error } = await supabase
    .from('teams')
    .update({
      ...rest,
      primary_color: primary_color ?? existing?.primary_color,
      secondary_color: secondary_color ?? existing?.secondary_color,
      captain_name: captain.captainName,
      captain_player_id: captain.playerId,
    })
    .eq('id', teamId)
    .eq('tournament_id', tournamentId);

  if (error) {
    if (error.code === '23505') {
      return { error: 'A team with this name already exists in this tournament' };
    }
    return { error: error.message };
  }

  if (existing?.global_team_id) {
    const service = await createServiceClient();
    await service
      .from('global_teams')
      .update({
        name: validated.name,
        short_name: validated.short_name,
        primary_color: validated.primary_color,
        secondary_color: validated.secondary_color,
      })
      .eq('id', existing.global_team_id);
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams/${teamId}`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/players`);
  return { success: true };
}

export async function toggleTeamActive(
  teamId: string,
  tournamentId: string,
  isActive: boolean
) {
  await requireVerifiedUser();
  await requireServiceGrant('tournaments');
  await requireTournamentRole(tournamentId, TEAM_MANAGER_ROLES);
  const supabase = await createClient();

  const { error } = await supabase
    .from('teams')
    .update({ is_active: isActive })
    .eq('id', teamId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  return { success: true };
}

/** Accept captain invite by attaching a global team. */
export async function acceptCaptainInvite(opts: {
  inviteId: string;
  globalTeamId: string;
  captainPersonId?: string;
}) {
  const user = await requireVerifiedUser();
  const me = await ensurePersonForAuthUser(user);
  if ('error' in me) return { error: me.error };

  const service = await createServiceClient();
  const { data: invite } = await service
    .from('tournament_captain_invites')
    .select('*')
    .eq('id', opts.inviteId)
    .eq('person_id', me.person.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!invite) return { error: 'Invite not found or already handled' };

  await ensureTeamMembership(opts.globalTeamId, me.person.id, 'captain');

  const entered = await enterGlobalTeamCore({
    tournamentId: invite.tournament_id,
    globalTeamId: opts.globalTeamId,
    captainPersonId: opts.captainPersonId || me.person.id,
    user,
  });
  if ('error' in entered) return entered;

  await service
    .from('tournament_captain_invites')
    .update({
      status: 'accepted',
      entry_team_id: entered.teamId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  revalidatePath(`/dashboard/tournaments/${invite.tournament_id}/teams`);
  revalidatePath('/dashboard/notifications');
  return entered;
}
