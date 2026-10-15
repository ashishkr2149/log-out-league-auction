import { createServiceClient } from '@/lib/supabase/server';
import type { Notification } from '@/types/database';

export async function createNotification(opts: {
  personId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  payload?: Record<string, unknown>;
}): Promise<{ notification: Notification } | { error: string }> {
  const service = await createServiceClient();
  const { data, error } = await service
    .from('notifications')
    .insert({
      person_id: opts.personId,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      href: opts.href ?? null,
      payload: opts.payload ?? {},
    })
    .select('*')
    .single();

  if (error) return { error: error.message };
  return { notification: data as Notification };
}

export async function listNotificationsForPerson(
  personId: string,
  limit = 30
): Promise<{ notifications: Notification[] } | { error: string }> {
  const service = await createServiceClient();
  const { data, error } = await service
    .from('notifications')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { error: error.message };
  return { notifications: (data ?? []) as Notification[] };
}

export async function markNotificationRead(notificationId: string, personId: string) {
  const service = await createServiceClient();
  const { error } = await service
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('person_id', personId);
  if (error) return { error: error.message };
  return { success: true as const };
}
