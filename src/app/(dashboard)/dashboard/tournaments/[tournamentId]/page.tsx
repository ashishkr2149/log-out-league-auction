import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, UserCheck, Gavel, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

  const [{ count: playerCount }, { count: teamCount }, { count: auctionCount }, { count: soldCount }] =
    await Promise.all([
      supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId),
      supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId),
      supabase
        .from('auctions')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId),
      supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('status', 'sold'),
    ]);

  const stats = [
    { label: 'Players', value: playerCount ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Teams', value: teamCount ?? 0, icon: UserCheck, color: 'text-green-400' },
    { label: 'Auctions', value: auctionCount ?? 0, icon: Gavel, color: 'text-yellow-400' },
    { label: 'Sold', value: soldCount ?? 0, icon: Trophy, color: 'text-red-400' },
  ];

  const manageLinks = [
    {
      title: 'Teams',
      href: `/dashboard/tournaments/${tournamentId}/teams`,
      description: `${teamCount ?? 0} teams registered`,
    },
    {
      title: 'Players',
      href: `/dashboard/tournaments/${tournamentId}/players`,
      description: `${playerCount ?? 0} players registered`,
    },
    {
      title: 'Auctions',
      href: `/dashboard/tournaments/${tournamentId}/auctions`,
      description: `${auctionCount ?? 0} auction events`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <Link href="/dashboard/tournaments">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{tournament.name}</h1>
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

      {/* Compact stats — 2×2 mobile, 4-up desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-slate-800 bg-slate-900/80">
            <CardContent className="flex items-center gap-3 p-3 sm:p-4">
              <Icon className={`h-6 w-6 sm:h-7 sm:w-7 shrink-0 ${color}`} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-slate-400 truncate">{label}</p>
                <p className="text-xl sm:text-2xl font-bold text-white leading-tight">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Manage shortcuts — stacked mobile, 3-up desktop */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {manageLinks.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          >
            <Card className="border-slate-800 bg-slate-900/80 h-full transition hover:border-slate-600 hover:bg-slate-900 cursor-pointer">
              <CardHeader className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-white text-base sm:text-lg">{item.title}</CardTitle>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white pointer-events-none shrink-0"
                    tabIndex={-1}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Manage
                  </Button>
                </div>
                <CardDescription className="text-slate-400">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
