import { ensurePersonForAuthUser } from '@/lib/auth/person';
import { createClient } from '@/lib/supabase/server';

/**
 * Claim / create person identity after login (cookies available on server).
 * Safe to run on every dashboard navigation — upsert is idempotent.
 */
export default async function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensurePersonForAuthUser(user);
  }

  return children;
}
