import { createClient } from '@/lib/supabase/server';
import { getPlatformRole } from '@/lib/auth/permissions';
import { AppHeader } from '@/components/shell/app-header';
import { MobileRadialNav } from '@/components/shell/mobile-radial-nav';
import { NavigationProgress } from '@/components/dashboard/navigation-progress';
import { DashboardChrome, DashboardMain } from '@/components/shell/dashboard-chrome';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const platformRole = await getPlatformRole();

  return (
    <DashboardChrome>
      <NavigationProgress />
      <AppHeader
        userEmail={user?.email}
        isPlatformStaff={platformRole !== null}
      />
      <DashboardMain>{children}</DashboardMain>
      <MobileRadialNav />
    </DashboardChrome>
  );
}
