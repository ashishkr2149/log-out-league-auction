'use server';

import { ensurePersonForAuthUser } from '@/lib/auth/person';
import {
  listNotificationsForPerson,
  markNotificationRead,
} from '@/lib/notifications';
import { requireVerifiedUser } from '@/lib/auth/permissions';
import type { Notification } from '@/types/database';

export async function listMyNotificationsAction(): Promise<{
  notifications: Notification[];
  error?: string;
}> {
  const user = await requireVerifiedUser();
  const me = await ensurePersonForAuthUser(user);
  if ('error' in me) return { notifications: [], error: me.error };
  const listed = await listNotificationsForPerson(me.person.id);
  if ('error' in listed) return { notifications: [], error: listed.error };
  return { notifications: listed.notifications };
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireVerifiedUser();
  const me = await ensurePersonForAuthUser(user);
  if ('error' in me) return { error: me.error };
  const result = await markNotificationRead(notificationId, me.person.id);
  if ('error' in result) return { error: result.error };
  return { success: true as const };
}
