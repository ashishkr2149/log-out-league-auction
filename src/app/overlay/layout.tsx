import type { Metadata } from 'next';
import { OverlayTransparency } from '@/components/overlay/overlay-transparency';

export const metadata: Metadata = {
  title: 'Auction Overlay',
  robots: 'noindex, nofollow',
};

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-auction-overlay
      style={{
        margin: 0,
        padding: 0,
        background: 'transparent',
        overflow: 'hidden',
        width: '1920px',
        height: '1080px',
      }}
    >
      <OverlayTransparency />
      {children}
    </div>
  );
}
