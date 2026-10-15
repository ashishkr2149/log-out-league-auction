import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensure a captain name maps to a real player record for the tournament.
 * Captains are marked withdrawn so they are not added to the auction queue.
 */
export async function ensureCaptainPlayer(
  supabase: SupabaseClient,
  tournamentId: string,
  captainName: string,
  existingCaptainPlayerId?: string | null
): Promise<{ playerId: string; captainName: string } | { error: string }> {
  const name = captainName.trim();
  if (!name) {
    return { error: 'Captain name is required' };
  }

  if (existingCaptainPlayerId) {
    const { data: existing } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', existingCaptainPlayerId)
      .eq('tournament_id', tournamentId)
      .maybeSingle();

    if (existing) {
      if (existing.name !== name) {
        await supabase
          .from('players')
          .update({
            name,
            display_name: name,
            status: 'withdrawn',
            notes: 'captain',
          })
          .eq('id', existing.id);
      }
      return { playerId: existing.id, captainName: name };
    }
  }

  const { data: byName } = await supabase
    .from('players')
    .select('id')
    .eq('tournament_id', tournamentId)
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  if (byName) {
    await supabase
      .from('players')
      .update({ status: 'withdrawn', notes: 'captain', display_name: name })
      .eq('id', byName.id);
    return { playerId: byName.id, captainName: name };
  }

  const { data: created, error } = await supabase
    .from('players')
    .insert({
      tournament_id: tournamentId,
      name,
      display_name: name,
      role: 'other',
      base_price: 0,
      status: 'withdrawn',
      notes: 'captain',
    })
    .select('id')
    .single();

  if (error || !created) {
    return { error: error?.message ?? 'Failed to create captain player' };
  }

  return { playerId: created.id, captainName: name };
}
