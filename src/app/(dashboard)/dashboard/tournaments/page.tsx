import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';


export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Tournaments</h1>
          <p className="mt-1 text-slate-400">Manage your cricket tournaments</p>
        </div>
        <Link href="/dashboard/tournaments/new">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Tournament
          </Button>
        </Link>
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-medium text-slate-300">No tournaments yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md text-center">
              Create your first Log Out League tournament to manage teams, players, and run auctions.
            </p>
            <Link href="/dashboard/tournaments/new" className="mt-6">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Tournament
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <Link key={tournament.id} href={`/dashboard/tournaments/${tournament.id}`}>
              <Card className="border-slate-800 bg-slate-900/80 transition-colors hover:border-slate-700 h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg"
                      style={{ backgroundColor: tournament.primary_color + '20' }}
                    >
                      <Trophy className="h-6 w-6" style={{ color: tournament.secondary_color }} />
                    </div>
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
                  <CardTitle className="text-white mt-3">{tournament.name}</CardTitle>
                  <CardDescription className="text-slate-400">
                    Season {tournament.season}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {tournament.description || 'No description'}
                  </p>
                  <div className="mt-4 flex items-center text-sm text-red-400">
                    Manage <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
