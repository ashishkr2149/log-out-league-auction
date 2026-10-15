'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Users, Swords, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEFT_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Teams', href: '/dashboard/teams', icon: Users },
] as const;

const RIGHT_ITEMS = [
  { label: 'Leagues', href: '/dashboard/tournaments', icon: Trophy },
  { label: 'Matches', href: '/dashboard/matches', icon: Swords },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({
  item,
  pathname,
  onNavigate,
}: {
  item: { label: string; href: string; icon: React.ElementType };
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 py-1 text-[10px] font-medium transition-colors',
        active ? 'text-primary' : 'text-foreground/80'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.4 : 2} />
      <span className="max-w-full truncate leading-none">{item.label}</span>
    </Link>
  );
}

function NavSide({
  items,
  pathname,
  onNavigate,
}: {
  items: readonly { label: string; href: string; icon: React.ElementType }[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-evenly gap-1">
      {items.map((item) => (
        <NavIcon
          key={item.href}
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

export function MobileRadialNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onScroll() {
      setOpen(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (pathname.includes('/control')) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.85rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="pointer-events-auto relative flex h-[4.25rem] w-full max-w-[26rem] items-center justify-center px-3">
        <div
          data-open={open ? 'true' : 'false'}
          className="mobile-nav-capsule liquid-glass h-[3.75rem] overflow-hidden rounded-full will-change-[width,transform,opacity]"
          aria-hidden={!open}
        >
          {open ? (
            <div className="flex h-full w-full items-center gap-1 px-3.5 animate-in fade-in duration-200">
              <NavSide
                items={LEFT_ITEMS}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
              {/* Spacer for the centered FAB — same width both sides stay mirrored */}
              <div aria-hidden className="w-14 shrink-0" />
              <NavSide
                items={RIGHT_ITEMS}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
          ) : null}
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'relative z-10 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground',
            'shadow-[0_8px_28px_rgba(225,29,72,0.45)] transition-transform duration-200 active:scale-95',
            open && 'scale-[0.9]'
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
