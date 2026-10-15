import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gavel, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getAuctionStatusLabel } from '@/lib/auction/validation';
import { CreateAuctionDialog } from './create-auction-dialog';
import { BackLink } from '@/components/shell/back-link';

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

  const auction = auctions?.[0] ?? null;
  const hasAuction = Boolean(auction);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <BackLink fallbackHref={`/dashboard/tournaments/${tournamentId}`} />
          <div className="min-w-0">
            <h1 className="page-title">Auction</h1>
            <p className="mt-1 text-muted-foreground truncate">{tournament.name}</p>
          </div>
        </div>
        {!hasAuction && (
          <CreateAuctionDialog tournamentId={tournamentId} tournamentName={tournament.name} />
        )}
      </div>

      {!hasAuction || !auction ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Gavel className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium text-muted-foreground">No auction yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Create the tournament auction to start selling players to teams
            </p>
            <div className="mt-6">
              <CreateAuctionDialog tournamentId={tournamentId} tournamentName={tournament.name} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card max-w-xl">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-foreground truncate">{auction.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {auction.currency_code} · bid increment {auction.default_bid_increment}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  auction.status === 'live'
                    ? 'border-emerald-600 text-emerald-600 shrink-0'
                    : auction.status === 'paused'
                      ? 'border-yellow-600 text-amber-600 shrink-0'
                      : auction.status === 'completed'
                        ? 'border-slate-500 text-muted-foreground shrink-0'
                        : 'border-border text-muted-foreground shrink-0'
                }
              >
                {getAuctionStatusLabel(auction.status)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/auctions/${auction.id}/control`}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Open Control</Button>
              </Link>
              <Link href={`/dashboard/auctions/${auction.id}/results`}>
                <Button variant="outline" className="border-border text-muted-foreground">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Results
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
