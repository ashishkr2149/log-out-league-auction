'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PlatformServiceKey, PlatformStaffRole } from '@/types/database';
import {
  invitePlatformStaffByEmail,
  removePlatformStaff,
  setPlatformServiceEnabled,
  updatePlatformStaffRole,
} from '@/lib/auth/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

type StaffRow = {
  id: string;
  user_id: string;
  role: PlatformStaffRole;
  email: string;
  created_at: string;
};

type ServiceRow = {
  service_key: string;
  is_enabled: boolean;
  updated_at: string;
};

const INVITE_ROLES: Exclude<PlatformStaffRole, 'owner'>[] = [
  'admin',
  'editor',
  'viewer',
];

interface Props {
  role: PlatformStaffRole;
  staff: StaffRow[];
  services: ServiceRow[];
}

export function PlatformAdminPanel({ role, staff, services }: Props) {
  const router = useRouter();
  const isOwner = role === 'owner';
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<PlatformStaffRole, 'owner'>>('admin');
  const [busy, setBusy] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setBusy('invite');
    try {
      const result = await invitePlatformStaffByEmail(email, inviteRole);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Staff member invited');
      setEmail('');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleService(serviceKey: PlatformServiceKey, enabled: boolean) {
    if (!isOwner) return;
    setBusy(`svc-${serviceKey}`);
    try {
      const result = await setPlatformServiceEnabled(serviceKey, enabled);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${serviceKey} ${enabled ? 'enabled' : 'disabled'}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleRoleChange(
    staffId: string,
    next: Exclude<PlatformStaffRole, 'owner'>
  ) {
    if (!isOwner) return;
    setBusy(`role-${staffId}`);
    try {
      const result = await updatePlatformStaffRole(staffId, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Role updated');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(staffId: string) {
    if (!isOwner) return;
    setBusy(`rm-${staffId}`);
    try {
      const result = await removePlatformStaff(staffId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Staff removed');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <Shield className="h-8 w-8 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Platform admin</h1>
          <p className="text-muted-foreground text-sm">
            Your role: <span className="text-foreground font-medium">{role}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Staff</CardTitle>
            <CardDescription className="text-muted-foreground">
              Owner / Admin / Editor / Viewer. Only the owner can invite or change roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isOwner && (
              <form onSubmit={handleInvite} className="space-y-3 rounded-lg border border-border p-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invite by email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="border-border bg-muted text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Role</Label>
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as Exclude<PlatformStaffRole, 'owner'>)
                    }
                    className="flex h-9 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground"
                  >
                    {INVITE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="submit"
                  disabled={busy === 'invite'}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {busy === 'invite' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Invite
                </Button>
              </form>
            )}

            <div className="space-y-2">
              {staff.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-border bg-muted/60 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground truncate">{row.email}</span>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      {row.role}
                    </Badge>
                  </div>
                  {isOwner && row.role !== 'owner' && (
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={row.role}
                        onChange={(e) =>
                          handleRoleChange(
                            row.id,
                            e.target.value as Exclude<PlatformStaffRole, 'owner'>
                          )
                        }
                        disabled={busy === `role-${row.id}`}
                        className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
                      >
                        {INVITE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-primary"
                        disabled={busy === `rm-${row.id}`}
                        onClick={() => handleRemove(row.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Service kill switches</CardTitle>
            <CardDescription className="text-muted-foreground">
              Disable a service for the whole platform without deleting data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {services.map((svc) => (
              <div
                key={svc.service_key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-foreground font-medium">{svc.service_key}</p>
                  <p className="text-xs text-muted-foreground">
                    {svc.is_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                {isOwner ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={
                      svc.is_enabled
                        ? 'border-amber-800 text-amber-300'
                        : 'border-green-800 text-green-300'
                    }
                    disabled={busy === `svc-${svc.service_key}`}
                    onClick={() =>
                      handleToggleService(
                        svc.service_key as PlatformServiceKey,
                        !svc.is_enabled
                      )
                    }
                  >
                    {svc.is_enabled ? 'Disable' : 'Enable'}
                  </Button>
                ) : (
                  <Badge
                    variant="outline"
                    className={
                      svc.is_enabled
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-border text-muted-foreground'
                    }
                  >
                    {svc.is_enabled ? 'On' : 'Off'}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
