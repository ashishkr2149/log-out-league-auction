import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Copy } from 'lucide-react';
import Link from 'next/link';


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

  // Get active overlay credentials
  const { data: credentials } = await supabase
    .from('overlay_credentials')
    .select('*')
    .eq('auction_id', auctionId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const overlayUrl = credentials?.[0]
    ? `${appUrl}/overlay/${credentials[0].credential_hash}` // Note: actual token needed, not hash
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/auctions/${auctionId}/control`}>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Overlay Preview</h1>
          <p className="mt-1 text-slate-400">{auction.name}</p>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-white">OBS Browser Source Preview</CardTitle>
          <CardDescription className="text-slate-400">
            This preview shows how the overlay will appear in OBS. 
            Use a 1920x1080 Browser Source with transparency enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overlayUrl ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-700 bg-black p-2">
                <div
                  className="relative bg-slate-950"
                  style={{ paddingBottom: '56.25%' }}
                >
                  <iframe
                    src={overlayUrl}
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 'none' }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <code className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 font-mono truncate">
                  {overlayUrl}
                </code>
                <Button variant="outline" className="border-slate-700 text-slate-300 shrink-0">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy URL
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">No overlay credential generated yet.</p>
              <p className="text-sm text-slate-600 mt-2">
                Generate an overlay credential from the auction settings to preview the overlay.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OBS Setup Instructions */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-white">OBS Browser Source Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-400">
          <ol className="list-decimal list-inside space-y-2">
            <li>Open OBS Studio</li>
            <li>In your scene, click <strong className="text-white">+</strong> under Sources</li>
            <li>Select <strong className="text-white">Browser</strong></li>
            <li>Name it <strong className="text-white">Auction Overlay</strong></li>
            <li>Paste the overlay URL above</li>
            <li>Set Width to <strong className="text-white">1920</strong> and Height to <strong className="text-white">1080</strong></li>
            <li>Leave FPS at 30</li>
            <li>Position the overlay above your desktop capture source</li>
            <li>The overlay background is transparent — only the graphics panel will be visible</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
