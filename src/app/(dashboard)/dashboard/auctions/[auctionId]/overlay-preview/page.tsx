import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { BackLink } from '@/components/shell/back-link';


interface Props {
  params: Promise<{ auctionId: string }>;
}

export default async function OverlayPreviewPage({ params }: Props) {
  const { auctionId } = await params;
  const supabase = await createClient();

  const { data: auction } = await supabase
    .from('auctions')
    .select('*, tournament:tournaments(name)')
    .eq('id', auctionId)
    .single();

  if (!auction) notFound();

  // Active credentials exist, but the raw token is only shown once at generation time.
  const { data: credentials } = await supabase
    .from('overlay_credentials')
    .select('id, label, is_active, created_at')
    .eq('auction_id', auctionId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  const hasCredential = Boolean(credentials?.[0]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <BackLink fallbackHref={`/dashboard/auctions/${auctionId}/control`} />
        <div className="min-w-0">
          <h1 className="page-title">Overlay Preview</h1>
          <p className="mt-1 text-muted-foreground truncate">{auction.name}</p>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">OBS Browser Source Preview</CardTitle>
          <CardDescription className="text-muted-foreground">
            This preview shows how the overlay will appear in OBS. 
            Use a 1920x1080 Browser Source with transparency enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasCredential ? (
            <div className="space-y-4 text-center py-6">
              <p className="text-muted-foreground">
                An active overlay credential exists for this auction.
              </p>
              <p className="text-sm text-muted-foreground">
                The full overlay URL is only shown once when you generate it.
                Open Settings to create a new credential if you no longer have the URL.
              </p>
              <Link href={`/dashboard/auctions/${auctionId}/settings`}>
                <Button variant="outline" className="border-border text-muted-foreground">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Auction Settings
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground">No overlay credential generated yet.</p>
              <p className="text-sm text-muted-foreground">
                Generate an overlay credential from auction settings to get your OBS URL.
              </p>
              <Link href={`/dashboard/auctions/${auctionId}/settings`}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Generate Overlay URL
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OBS Setup Instructions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">OBS Browser Source Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Open OBS Studio</li>
            <li>In your scene, click <strong className="text-foreground">+</strong> under Sources</li>
            <li>Select <strong className="text-foreground">Browser</strong></li>
            <li>Name it <strong className="text-foreground">Auction Overlay</strong></li>
            <li>Paste the overlay URL above</li>
            <li>Set Width to <strong className="text-foreground">1920</strong> and Height to <strong className="text-foreground">1080</strong></li>
            <li>Leave FPS at 30</li>
            <li>Position the overlay above your desktop capture source</li>
            <li>The overlay background is transparent — only the graphics panel will be visible</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
