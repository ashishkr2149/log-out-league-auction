import { validateOverlayToken } from '@/lib/overlay/credentials';
import { getOverlayPublicState } from '@/lib/overlay/public-state';
import { OverlayRenderer } from '@/components/overlay/overlay-renderer';
import { notFound } from 'next/navigation';


interface Props {
  params: Promise<{ overlayToken: string }>;
}

export default async function OverlayPage({ params }: Props) {
  const { overlayToken } = await params;

  // Validate the overlay token
  const validation = await validateOverlayToken(overlayToken);
  if (!validation.valid || !validation.auctionId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-transparent">
        <p className="text-white/30 text-sm">Invalid or expired overlay credential</p>
      </div>
    );
  }

  // Fetch initial state
  const initialState = await getOverlayPublicState(validation.auctionId);
  if (!initialState) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-transparent">
        <p className="text-white/30 text-sm">Auction not found</p>
      </div>
    );
  }

  return (
    <OverlayRenderer
      initialState={initialState}
      overlayToken={overlayToken}
      auctionId={validation.auctionId}
    />
  );
}
