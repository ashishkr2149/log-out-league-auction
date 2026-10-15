import { getPlatformRole } from '@/lib/auth/permissions';
import {
  listPlatformServiceGrants,
  listPlatformServices,
  listPlatformStaff,
} from '@/lib/auth/platform';
import { PlatformAdminPanel } from '@/components/platform/platform-admin-panel';
import { PlatformGrantsPanel } from '@/components/platform/platform-grants-panel';
import { BootstrapOwnerButton } from '@/components/platform/bootstrap-owner-button';
import { Button } from '@/components/ui/button';
import { BackLink } from '@/components/shell/back-link';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export default async function PlatformAdminPage() {
  const role = await getPlatformRole();

  if (!role) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-start gap-3">
          <BackLink fallbackHref="/dashboard" />
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title">Platform</h1>
            <p className="caption mt-1">No platform staff role on this account yet.</p>
          </div>
        </div>
        <section className="panel space-y-3 p-4">
          <h2 className="section-title">Bootstrap owner</h2>
          <p className="caption">
            If you&apos;re the first operator here, claim the owner role once. After that, only
            the owner can invite other staff.
          </p>
          <BootstrapOwnerButton />
        </section>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Back to home
          </Button>
        </Link>
      </div>
    );
  }

  const [staffResult, servicesResult, grantsResult] = await Promise.all([
    listPlatformStaff(),
    listPlatformServices(),
    listPlatformServiceGrants(),
  ]);

  if ('error' in staffResult && staffResult.error) {
    return <p className="text-destructive">{staffResult.error}</p>;
  }
  if ('error' in servicesResult && servicesResult.error) {
    return <p className="text-destructive">{servicesResult.error}</p>;
  }
  if ('error' in grantsResult && grantsResult.error) {
    return <p className="text-destructive">{grantsResult.error}</p>;
  }

  const staff =
    'staff' in staffResult && staffResult.staff ? staffResult.staff : [];
  const services =
    'services' in servicesResult && servicesResult.services
      ? servicesResult.services
      : [];
  const grants =
    'grants' in grantsResult && grantsResult.grants ? grantsResult.grants : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <BackLink fallbackHref="/dashboard" />
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="page-title">Platform</h1>
          <p className="caption mt-1 capitalize">
            Your role: {role}
          </p>
        </div>
      </div>
      <PlatformAdminPanel role={role} staff={staff} services={services} />
      <PlatformGrantsPanel role={role} staff={staff} grants={grants} />
    </div>
  );
}
