import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/auction/validation';
import { GenerateOverlayCredential } from '@/components/auction/generate-overlay-credential';


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

  // Fetch overlay credentials
  const { data: credentials } = await supabase
    .from('overlay_credentials')
    .select('*')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/auctions/${auctionId}/control`}>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Auction Settings</h1>
          <p className="mt-1 text-slate-400">{auction.name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-white">Auction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Name</span>
              <span className="text-white">{auction.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {auction.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Currency</span>
              <span className="text-white">{auction.currency_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Default Increment</span>
              <span className="text-white">{formatCurrency(auction.default_bid_increment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">State Version</span>
              <span className="text-white font-mono">{auction.state_version}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-white">Overlay Credentials</CardTitle>
            <CardDescription className="text-slate-400">
              Generate overlay URLs for OBS Browser Source
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GenerateOverlayCredential auctionId={auctionId} />

            {credentials && credentials.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Existing credentials</p>
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{cred.label}</span>
                      <Badge
                        variant="outline"
                        className={cred.is_active ? 'border-green-600 text-green-400' : 'border-red-600 text-red-400'}
                      >
                        {cred.is_active ? 'Active' : 'Revoked'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Created {new Date(cred.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-600">
              Overlay URL format: {appUrl}/overlay/[token]
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
