'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Trophy,
  LayoutDashboard,
  Users,
  UserRound,
  Shield,
  LogOut,
  Settings,
  Info,
} from 'lucide-react';
import { NotificationsModal } from '@/components/shell/notifications-modal';

const DESKTOP_NAV = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tournaments', href: '/dashboard/tournaments', icon: Trophy },
  { label: 'Teams', href: '/dashboard/teams', icon: Users },
] as const;

function navActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({
  userEmail,
  isPlatformStaff,
}: {
  userEmail?: string | null;
  isPlatformStaff?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initial = (userEmail?.trim()?.[0] ?? 'U').toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  // Auction control uses its own minimal chrome
  if (pathname.includes('/control')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-5 lg:h-16 lg:px-8">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 shrink-0">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25">
            <Trophy className="h-4 w-4" />
          </span>
          <span className="font-display truncate text-[0.9375rem] font-semibold tracking-tight text-foreground">
            Log Out League
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {DESKTOP_NAV.map((item) => {
            const active = navActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <NotificationsModal />

          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="Account menu"
            >
              {initial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52 rounded-2xl p-1.5">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-foreground">Account</p>
                  {userEmail ? (
                    <p className="caption truncate">{userEmail}</p>
                  ) : null}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="rounded-full"
                  onClick={() => router.push('/dashboard/me')}
                >
                  <UserRound className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-full"
                  onClick={() => router.push('/dashboard/me')}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {isPlatformStaff ? (
                  <DropdownMenuItem
                    className="rounded-full"
                    onClick={() => router.push('/dashboard/platform')}
                  >
                    <Shield className="h-4 w-4" />
                    Platform
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="rounded-full"
                  onClick={() => router.push('/dashboard/me')}
                >
                  <Info className="h-4 w-4" />
                  About
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="rounded-full text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
