import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, UserCheck, Gavel, Plus, ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import { CreateAuctionForm } from '@/components/auction/create-auction-form';


interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentDetailPage({ params }: Props) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (error || !tournament) {
    notFound();
  }

  // Fetch counts
  const { count: playerCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  const { count: teamCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  const { data: auctions } = await supabase
    .from('auctions')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false });

  const { count: soldCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('status', 'sold');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tournaments">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
              <Badge
                variant="outline"
                className={
                  tournament.status === 'active'
                    ? 'border-green-600 text-green-400'
                    : tournament.status === 'completed'
                      ? 'border-slate-600 text-slate-400'
                      : 'border-yellow-600 text-yellow-400'
                }
              >
                {tournament.status}
              </Badge>
            </div>
            <p className="mt-1 text-slate-400">Season {tournament.season}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="flex items-center gap-4 p-6">
            <Users className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-sm text-slate-400">Players</p>
              <p className="text-2xl font-bold text-white">{playerCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="flex items-center gap-4 p-6">
            <UserCheck className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-sm text-slate-400">Teams</p>
              <p className="text-2xl font-bold text-white">{teamCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="flex items-center gap-4 p-6">
            <Gavel className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-sm text-slate-400">Auctions</p>
              <p className="text-2xl font-bold text-white">{auctions?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="flex items-center gap-4 p-6">
            <Trophy className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-sm text-slate-400">Players Sold</p>
              <p className="text-2xl font-bold text-white">{soldCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Teams */}
        <Link
          href={`/dashboard/tournaments/${tournamentId}/teams`}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
        >
          <Card className="border-slate-800 bg-slate-900/80 h-full transition hover:border-slate-600 hover:bg-slate-900 cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Teams</CardTitle>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white pointer-events-none"
                  tabIndex={-1}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Manage
                </Button>
              </div>
              <CardDescription className="text-slate-400">
                {teamCount ?? 0} teams registered
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Players */}
        <Link
          href={`/dashboard/tournaments/${tournamentId}/players`}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
        >
          <Card className="border-slate-800 bg-slate-900/80 h-full transition hover:border-slate-600 hover:bg-slate-900 cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Players</CardTitle>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white pointer-events-none"
                  tabIndex={-1}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Manage
                </Button>
              </div>
              <CardDescription className="text-slate-400">
                {playerCount ?? 0} players registered
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Auctions */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Auctions</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              {auctions?.length ?? 0} auction events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auctions && auctions.length > 0 ? (
              <div className="space-y-2">
                {auctions.map((auction) => (
                  <Link
                    key={auction.id}
                    href={`/dashboard/auctions/${auction.id}/control`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-3 transition-colors hover:bg-slate-800/70"
                  >
                    <span className="text-sm text-white">{auction.name}</span>
                    <Badge
                      variant="outline"
                      className={
                        auction.status === 'live'
                          ? 'border-green-600 text-green-400'
                          : auction.status === 'paused'
                            ? 'border-yellow-600 text-yellow-400'
                            : 'border-slate-600 text-slate-400'
                      }
                    >
                      {auction.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No auctions created yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Auction Section */}
      <CreateAuctionForm tournamentId={tournamentId} tournamentName={tournament.name} />
    </div>
  );
}
