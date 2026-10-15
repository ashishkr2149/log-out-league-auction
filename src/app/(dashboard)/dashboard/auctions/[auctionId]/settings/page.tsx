import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/auction/validation';
import { OverlayCredentialsManager } from '@/components/auction/overlay-credentials-manager';
import { BackLink } from '@/components/shell/back-link';

interface Props {
  params: Promise<{ auctionId: string }>;
}

export default async function AuctionSettingsPage({ params }: Props) {
  const { auctionId } = await params;
  const supabase = await createClient();

  const { data: auction } = await supabase
    .from('auctions')
    .select('*, tournament:tournaments(id, name)')
    .eq('id', auctionId)
    .single();

  if (!auction) notFound();

  const { data: credentials } = await supabase
    .from('overlay_credentials')
    .select(
      'id, label, is_active, expires_at, created_at, created_by, revoked_at, revoked_by'
    )
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <BackLink fallbackHref={`/dashboard/auctions/${auctionId}/control`} />
        <div className="min-w-0">
          <h1 className="page-title">Auction Settings</h1>
          <p className="mt-1 text-muted-foreground truncate">{auction.name}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Auction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground shrink-0">Name</span>
              <span className="text-foreground text-right truncate">{auction.name}</span>
            </div>
            <div className="flex justify-between gap-3 items-center">
              <span className="text-muted-foreground shrink-0">Status</span>
              <Badge variant="outline" className="border-border text-muted-foreground">
                {auction.status}
              </Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground shrink-0">Currency</span>
              <span className="text-foreground">{auction.currency_code}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground shrink-0">Default Increment</span>
              <span className="text-foreground">
                {formatCurrency(auction.default_bid_increment, auction.currency_code)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground shrink-0">State Version</span>
              <span className="text-foreground font-mono">{auction.state_version}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Overlay Credentials</CardTitle>
            <CardDescription className="text-muted-foreground">
              Generate OBS links, set expiry, and revoke with an audit trail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OverlayCredentialsManager
              auctionId={auctionId}
              credentials={credentials ?? []}
              appUrl={appUrl}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
