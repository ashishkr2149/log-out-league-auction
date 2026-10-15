'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * History-stack back control. Uses router.back() when possible;
 * falls back to `fallbackHref` when there is no history entry.
 */
export function BackLink({
  fallbackHref = '/dashboard',
  className,
  label = 'Back',
}: {
  fallbackHref?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className
      )}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}

/** Static link when a fixed parent is preferred over history. */
export function BackHref({
  href,
  className,
  label = 'Back',
}: {
  href: string;
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className
      )}
    >
      <ChevronLeft className="h-5 w-5" />
    </Link>
  );
}
