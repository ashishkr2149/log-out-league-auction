import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, UserCheck, Gavel, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';


export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user's tournaments
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch summary stats
  const { count: playerCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  const { count: teamCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true });

  const { count: auctionCount } = await supabase
    .from('auctions')
    .select('*', { count: 'exact', head: true });

  const { count: soldCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold');

  const stats = [
    { label: 'Tournaments', value: tournaments?.length ?? 0, icon: Trophy, color: 'text-red-400' },
    { label: 'Total Players', value: playerCount ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Total Teams', value: teamCount ?? 0, icon: UserCheck, color: 'text-green-400' },
    { label: 'Auctions', value: auctionCount ?? 0, icon: Gavel, color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-slate-400">
            Welcome back{user?.email ? `, ${user.email}` : ''}
          </p>
        </div>
        <Link href="/dashboard/tournaments/new">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Tournament
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-slate-800 bg-slate-900/80">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800 ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tournaments List */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-white">Your Tournaments</CardTitle>
          <CardDescription className="text-slate-400">
            Manage tournaments, teams, players, and auctions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tournaments || tournaments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-300">No tournaments yet</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm">
                Create your first tournament to get started with teams, players, and auctions.
              </p>
              <Link href="/dashboard/tournaments/new" className="mt-4">
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tournament
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/dashboard/tournaments/${tournament.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-4 transition-colors hover:bg-slate-800/70"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: tournament.primary_color + '20' }}
                    >
                      <Trophy className="h-5 w-5" style={{ color: tournament.secondary_color }} />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{tournament.name}</h3>
                      <p className="text-sm text-slate-400">Season {tournament.season}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Players Sold */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-white">Auction Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Players Sold</span>
                <span className="text-lg font-bold text-green-400">{soldCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total Players</span>
                <span className="text-lg font-bold text-white">{playerCount ?? 0}</span>
              </div>
              {(playerCount ?? 0) > 0 && (
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                    style={{ width: `${((soldCount ?? 0) / (playerCount ?? 1)) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/tournaments/new" className="block">
              <Button variant="outline" className="w-full justify-start border-slate-700 text-slate-300 hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" />
                Create New Tournament
              </Button>
            </Link>
            <Link href="/dashboard/tournaments" className="block">
              <Button variant="outline" className="w-full justify-start border-slate-700 text-slate-300 hover:bg-slate-800">
                <Trophy className="mr-2 h-4 w-4" />
                View All Tournaments
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
