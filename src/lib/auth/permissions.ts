import { createClient } from '@/lib/supabase/server';
import { TournamentMemberRole } from '@/types/database';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
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

export async function getUserTournamentRole(
  tournamentId: string
): Promise<TournamentMemberRole | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  
  // Check if user is the tournament creator
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('created_by')
    .eq('id', tournamentId)
    .single();

  if (tournament?.created_by === user.id) return 'admin';

  // Check tournament membership
  const { data: member } = await supabase
    .from('tournament_members')
    .select('role')
    .eq('tournament_id', tournamentId)
    .eq('user_id', user.id)
    .single();

  return (member?.role as TournamentMemberRole) ?? null;
}

export async function requireTournamentRole(
  tournamentId: string,
  requiredRoles: TournamentMemberRole[]
): Promise<TournamentMemberRole> {
  const role = await getUserTournamentRole(tournamentId);
  if (!role || !requiredRoles.includes(role)) {
    throw new Error('Insufficient permissions');
  }
  return role;
}

export async function isAuctionOperator(auctionId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();

  // Check direct assignment
  const { data: assignment } = await supabase
    .from('auction_operator_assignments')
    .select('id')
    .eq('auction_id', auctionId)
    .eq('user_id', user.id)
    .single();

  if (assignment) return true;

  // Check if admin of the tournament
  const { data: auction } = await supabase
    .from('auctions')
    .select('tournament_id')
    .eq('id', auctionId)
    .single();

  if (!auction) return false;

  const role = await getUserTournamentRole(auction.tournament_id);
  return role === 'admin';
}

export async function requireAuctionOperator(auctionId: string) {
  const isOperator = await isAuctionOperator(auctionId);
  if (!isOperator) {
    throw new Error('Must be an auction operator');
  }
}
