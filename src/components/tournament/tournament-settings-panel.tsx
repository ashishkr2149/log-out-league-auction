'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTournamentSettings } from '@/app/(dashboard)/dashboard/tournaments/actions';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TournamentAccessMode, TournamentStatus } from '@/types/database';

interface Props {
  tournamentId: string;
  accessMode: TournamentAccessMode;
  viewersCanSeePurse: boolean;
  status: TournamentStatus;
  location: string | null;
  startsAt: string | null;
  maxTeams: number | null;
  canManage: boolean;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TournamentSettingsPanel({
  tournamentId,
  accessMode: initialAccess,
  viewersCanSeePurse: initialPurse,
  status: initialStatus,
  location: initialLocation,
  startsAt: initialStartsAt,
  maxTeams: initialMaxTeams,
  canManage,
}: Props) {
  const [accessMode, setAccessMode] = useState<TournamentAccessMode>(initialAccess);
  const [viewersCanSeePurse, setViewersCanSeePurse] = useState(initialPurse);
  const [status, setStatus] = useState<TournamentStatus>(initialStatus);
  const [location, setLocation] = useState(initialLocation ?? '');
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(initialStartsAt));
  const [maxTeams, setMaxTeams] = useState(
    initialMaxTeams != null ? String(initialMaxTeams) : ''
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!canManage) {
    return (
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Access</dt>
          <dd className="text-foreground capitalize">{initialAccess}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Spectator purse</dt>
          <dd className="text-foreground">{initialPurse ? 'Visible' : 'Hidden'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="text-foreground capitalize">{initialStatus}</dd>
        </div>
      </dl>
    );
  }

  function onSave() {
    startTransition(async () => {
      const parsedMax = maxTeams.trim() ? Number(maxTeams) : null;
      const result = await updateTournamentSettings(tournamentId, {
        access_mode: accessMode,
        viewers_can_see_purse: viewersCanSeePurse,
        status,
        location: location.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        max_teams:
          parsedMax != null && Number.isFinite(parsedMax) && parsedMax > 0
            ? Math.floor(parsedMax)
            : null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Tournament settings saved');
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Location</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ground / city"
            className="border-border bg-muted text-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Starts</Label>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="border-border bg-muted text-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Max teams</Label>
          <Input
            type="number"
            min={1}
            value={maxTeams}
            onChange={(e) => setMaxTeams(e.target.value)}
            placeholder="Optional"
            className="border-border bg-muted text-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Access</Label>
          <Select
            value={accessMode}
            onValueChange={(v) => setAccessMode(v as TournamentAccessMode)}
          >
            <SelectTrigger className="border-border bg-muted text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-muted">
              <SelectItem value="private" className="text-foreground">
                Private — invite only
              </SelectItem>
              <SelectItem value="open" className="text-foreground">
                Open — anyone can join as spectator
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as TournamentStatus)}
          >
            <SelectTrigger className="border-border bg-muted text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-muted">
              {(['draft', 'active', 'completed', 'archived'] as const).map((s) => (
                <SelectItem key={s} value={s} className="text-foreground capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3 pb-1">
          <input
            id="viewer-purse"
            type="checkbox"
            className="h-4 w-4 rounded border-border bg-muted"
            checked={viewersCanSeePurse}
            onChange={(e) => setViewersCanSeePurse(e.target.checked)}
          />
          <Label htmlFor="viewer-purse" className="text-muted-foreground leading-snug">
            Spectators can see team purse
          </Label>
        </div>
      </div>
      <Button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </div>
  );
}
