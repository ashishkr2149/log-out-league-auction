'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Bell, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  listMyNotificationsAction,
  markNotificationReadAction,
} from '@/app/(dashboard)/dashboard/notifications/actions';
import type { Notification } from '@/types/database';
import { cn } from '@/lib/utils';

export function NotificationsModal() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listMyNotificationsAction().then((result) => {
      if (cancelled || result.error) return;
      setItems(result.notifications);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listMyNotificationsAction()
      .then((result) => {
        if (cancelled) return;
        if (result.error) setError(result.error);
        setItems(result.notifications);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function markRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    });
  }

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Notifications"
        className="relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
        ) : null}
      </DialogTrigger>
      <DialogContent
        className="max-h-[min(32rem,85dvh)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md"
        showCloseButton
      >
        <DialogHeader className="border-b border-border px-4 py-3.5 text-left">
          <DialogTitle className="text-base">Notifications</DialogTitle>
          <DialogDescription className="caption">
            Captain invites, match updates, and more
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(24rem,60dvh)] overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : error ? (
            <p className="px-1 py-6 text-center text-sm text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-2 py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'rounded-2xl border border-border px-3 py-2.5',
                    n.read_at ? 'opacity-70' : 'bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {n.body ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                      ) : null}
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => setOpen(false)}
                          className="mt-1.5 inline-block text-xs font-medium text-primary"
                        >
                          Open →
                        </Link>
                      ) : null}
                    </div>
                    {!n.read_at ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => markRead(n.id)}
                        className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
