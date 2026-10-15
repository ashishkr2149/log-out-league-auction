'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  inviteTournamentStaffByEmail,
  revokeTournamentStaffRole,
} from '@/app/(dashboard)/dashboard/tournaments/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { TournamentMemberRole } from '@/types/database';

const ROLES: Exclude<TournamentMemberRole, 'admin'>[] = [
  'organizer',
  'operator',
  'scorer',
  'umpire',
  'team_manager',
  'viewer',
];

type StaffRow = {
  id: string;
  role: string;
  persons:
    | {
        id: string;
        display_name: string;
        primary_email: string | null;
        claim_status: string;
      }
    | {
        id: string;
        display_name: string;
        primary_email: string | null;
        claim_status: string;
      }[]
    | null;
};

function personFromRow(row: StaffRow) {
  const p = row.persons;
  return Array.isArray(p) ? p[0] : p;
}

export function StaffInvitePanel({
  tournamentId,
  initialStaff,
  canManage,
}: {
  tournamentId: string;
  initialStaff: StaffRow[];
  canManage: boolean;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<Exclude<TournamentMemberRole, 'admin'>>('scorer');
  const [pending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const router = useRouter();

  function onInvite(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteTournamentStaffByEmail(tournamentId, {
        email,
        role,
        display_name: displayName || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.claimed
          ? 'Role assigned — they already have an account'
          : 'Person registered — they can claim by signing up with this email'
      );
      setEmail('');
      setDisplayName('');
      router.refresh();
    });
  }

  function onRevoke(assignmentId: string) {
    setRevokingId(assignmentId);
    startTransition(async () => {
      const result = await revokeTournamentStaffRole(tournamentId, assignmentId);
      setRevokingId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Role removed');
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={onInvite} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label className="text-muted-foreground">Email *</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              className="border-border bg-muted text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Name (optional)</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="If not already known"
              className="border-border bg-muted text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as Exclude<TournamentMemberRole, 'admin'>)}
            >
              <SelectTrigger className="border-border bg-muted text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-muted">
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="text-foreground">
                    {r === 'viewer' ? 'spectator' : r.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {pending && !revokingId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Add role
            </Button>
          </div>
        </form>
      )}

      {initialStaff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No staff assignments yet.</p>
      ) : (
        <ul className="space-y-2">
          {initialStaff.map((row) => {
            const person = personFromRow(row);
            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {person?.display_name || person?.primary_email || 'Person'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {person?.primary_email ?? '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {row.role === 'viewer' ? 'spectator' : row.role.replace('_', ' ')}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      person?.claim_status === 'claimed'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-amber-700 text-amber-600'
                    }
                  >
                    {person?.claim_status ?? 'unclaimed'}
                  </Badge>
                  {canManage && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      aria-label={`Remove ${row.role}`}
                      disabled={pending && revokingId === row.id}
                      onClick={() => onRevoke(row.id)}
                    >
                      {revokingId === row.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
