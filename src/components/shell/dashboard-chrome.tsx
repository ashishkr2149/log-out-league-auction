'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Light app chrome by default. Auction control stays a dark island.
 */
export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuctionControl = pathname.includes('/control');

  return (
    <div
      className={cn(
        'min-h-dvh bg-background text-foreground',
        isAuctionControl && 'dark bg-background'
      )}
      data-auction-control={isAuctionControl ? 'true' : undefined}
    >
      {children}
    </div>
  );
}

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuctionControl = pathname.includes('/control');

  if (isAuctionControl) {
    return <main className="min-h-dvh w-full">{children}</main>;
  }

  return (
    <main className="mx-auto min-h-[calc(100dvh-3.5rem)] max-w-6xl px-3 pb-28 pt-5 sm:px-5 lg:px-8 lg:pb-10 lg:pt-8">
      {children}
    </main>
  );
}
