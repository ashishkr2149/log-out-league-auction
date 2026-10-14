import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gavel, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getAuctionStatusLabel } from '@/lib/auction/validation';
import { CreateAuctionDialog } from './create-auction-dialog';

interface Props {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentAuctionsPage({ params }: Props) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) notFound();

  const { data: auctions } = await supabase
    .from('auctions')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/tournaments/${tournamentId}`}>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Auctions</h1>
            <p className="mt-1 text-slate-400">
              {tournament.name} — {auctions?.length ?? 0} auction
              {(auctions?.length ?? 0) === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <CreateAuctionDialog tournamentId={tournamentId} tournamentName={tournament.name} />
      </div>

      {!auctions || auctions.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Gavel className="h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-xl font-medium text-slate-300">No auctions yet</h3>
            <p className="mt-2 text-sm text-slate-500 text-center max-w-sm">
              Create an auction to start selling players to teams
            </p>
            <div className="mt-6">
              <CreateAuctionDialog tournamentId={tournamentId} tournamentName={tournament.name} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((auction) => (
            <Card
              key={auction.id}
              className="border-slate-800 bg-slate-900/80 transition hover:border-slate-600"
            >
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-white truncate">{auction.name}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {auction.currency_code} · increment {auction.default_bid_increment}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      auction.status === 'live'
                        ? 'border-green-600 text-green-400 shrink-0'
                        : auction.status === 'paused'
                          ? 'border-yellow-600 text-yellow-400 shrink-0'
                          : auction.status === 'completed'
                            ? 'border-slate-500 text-slate-300 shrink-0'
                            : 'border-slate-600 text-slate-400 shrink-0'
                    }
                  >
                    {getAuctionStatusLabel(auction.status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/auctions/${auction.id}/control`}>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                      Open Control
                    </Button>
                  </Link>
                  <Link href={`/dashboard/auctions/${auction.id}/results`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-300"
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Results
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
