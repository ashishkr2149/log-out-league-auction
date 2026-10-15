'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PlatformServiceKey, PlatformStaffRole } from '@/types/database';
import { setPlatformServiceGrant } from '@/lib/auth/platform';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_KEYS: PlatformServiceKey[] = [
  'tournaments',
  'auctions',
  'overlays',
  'matches',
  'billing',
  'users',
];

type StaffRow = {
  id: string;
  user_id: string;
  role: PlatformStaffRole;
  email: string;
};

type GrantRow = {
  id: string;
  staff_id: string;
  service_key: string;
  can_read: boolean;
  can_write: boolean;
  can_admin: boolean;
};

interface Props {
  role: PlatformStaffRole;
  staff: StaffRow[];
  grants: GrantRow[];
}

export function PlatformGrantsPanel({ role, staff, grants }: Props) {
  const router = useRouter();
  const isOwner = role === 'owner';
  const [busy, setBusy] = useState<string | null>(null);
  const editableStaff = staff.filter((s) => s.role !== 'owner');

  function grantFor(staffId: string, serviceKey: string): GrantRow | undefined {
    return grants.find((g) => g.staff_id === staffId && g.service_key === serviceKey);
  }

  async function toggle(
    staffId: string,
    serviceKey: PlatformServiceKey,
    field: 'can_read' | 'can_write' | 'can_admin'
  ) {
    if (!isOwner) return;
    const current = grantFor(staffId, serviceKey);
    const next = {
      can_read: current?.can_read ?? false,
      can_write: current?.can_write ?? false,
      can_admin: current?.can_admin ?? false,
      [field]: !(current?.[field] ?? false),
    };
    const key = `${staffId}-${serviceKey}-${field}`;
    setBusy(key);
    try {
      const result = await setPlatformServiceGrant({
        staffId,
        serviceKey,
        ...next,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Grant updated');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (editableStaff.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Service grants</CardTitle>
          <CardDescription className="text-muted-foreground">
            Invite admin/editor/viewer staff to manage per-service read/write/admin grants.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Service grants</CardTitle>
        <CardDescription className="text-muted-foreground">
          Non-owner platform staff need grants to use each service. Kill switches still apply
          globally.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editableStaff.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-border bg-muted/50 p-3 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-foreground truncate">{row.email}</span>
              <Badge variant="outline" className="border-border text-muted-foreground">
                {row.role}
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="py-1 pr-2 font-medium">Service</th>
                    <th className="py-1 px-2 font-medium">Read</th>
                    <th className="py-1 px-2 font-medium">Write</th>
                    <th className="py-1 px-2 font-medium">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {SERVICE_KEYS.map((svc) => {
                    const g = grantFor(row.id, svc);
                    return (
                      <tr key={svc} className="border-t border-border">
                        <td className="py-2 pr-2 text-muted-foreground">{svc}</td>
                        {(['can_read', 'can_write', 'can_admin'] as const).map((field) => {
                          const on = g?.[field] ?? false;
                          const key = `${row.id}-${svc}-${field}`;
                          return (
                            <td key={field} className="py-2 px-2">
                              {isOwner ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className={
                                    on
                                      ? 'h-7 border-green-800 text-green-300'
                                      : 'h-7 border-border text-muted-foreground'
                                  }
                                  disabled={busy === key}
                                  onClick={() => toggle(row.id, svc, field)}
                                >
                                  {busy === key ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : on ? (
                                    'On'
                                  ) : (
                                    'Off'
                                  )}
                                </Button>
                              ) : (
                                <span className={on ? 'text-emerald-600' : 'text-muted-foreground'}>
                                  {on ? 'On' : 'Off'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
