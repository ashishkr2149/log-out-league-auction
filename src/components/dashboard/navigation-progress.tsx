'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Instant top progress bar on internal link clicks so navigation
 * feels immediate even while the next RSC payload is loading.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === pathname && url.search === window.location.search) return;
        setActive(true);
      } catch {
        // ignore invalid urls
      }
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-transparent',
        !active && 'opacity-0'
      )}
    >
      <div
        className={cn(
          'h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.65)] transition-[width] duration-500 ease-out',
          active ? 'w-[70%]' : 'w-0'
        )}
      />
    </div>
  );
}
