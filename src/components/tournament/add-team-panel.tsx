'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createTeam,
  enterGlobalTeamInTournament,
  getMyTeamsForEntry,
  inviteCaptainByEmail,
  listGlobalTeamMembers,
  searchTeamsForEntry,
} from '@/app/(dashboard)/dashboard/tournaments/[tournamentId]/teams/actions';
import { teamSchema, TeamFormData } from '@/lib/validation/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { GlobalTeam } from '@/types/database';

type Mode = 'create' | 'my' | 'search' | 'captain';

type MemberRow = {
  id: string;
  role: string;
  person_id: string;
  persons:
    | {
        id: string;
        display_name: string;
        primary_email: string | null;
        primary_phone: string | null;
      }
    | {
        id: string;
        display_name: string;
        primary_email: string | null;
        primary_phone: string | null;
      }[]
    | null;
};

function personOf(m: MemberRow) {
  const p = m.persons;
  return Array.isArray(p) ? p[0] : p;
}

export function AddTeamPanel({ tournamentId }: { tournamentId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [pending, startTransition] = useTransition();
  const [myTeams, setMyTeams] = useState<(GlobalTeam & { my_role?: string })[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalTeam[]>([]);
  const [selectedGlobalId, setSelectedGlobalId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [addNewCaptain, setAddNewCaptain] = useState(false);
  const [iAmCaptain, setIAmCaptain] = useState(true);
  const [captainEmail, setCaptainEmail] = useState('');
  const [captainPhone, setCaptainPhone] = useState('');
  const [captainDisplay, setCaptainDisplay] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDisplay, setInviteDisplay] = useState('');
  const router = useRouter();

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      initial_purse: 100,
      max_roster_size: 6,
    },
  });

  useEffect(() => {
    if (!open || mode !== 'my') return;
    startTransition(async () => {
      const result = await getMyTeamsForEntry();
      if ('teams' in result) setMyTeams(result.teams ?? []);
    });
  }, [open, mode]);

  useEffect(() => {
    if (!open || mode !== 'search') return;
    const t = setTimeout(() => {
      startTransition(async () => {
        const result = await searchTeamsForEntry(searchQ);
        if ('teams' in result) setSearchResults(result.teams ?? []);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [open, mode, searchQ]);

  useEffect(() => {
    if (!selectedGlobalId || (mode !== 'my' && mode !== 'search')) {
      setMembers([]);
      return;
    }
    startTransition(async () => {
      const result = await listGlobalTeamMembers(selectedGlobalId);
      if ('members' in result) {
        setMembers((result.members ?? []) as MemberRow[]);
      }
    });
  }, [selectedGlobalId, mode]);

  function onCreate(data: TeamFormData) {
    setNeedsName(false);
    startTransition(async () => {
      const result = await createTeam(tournamentId, {
        ...data,
        iAmCaptain,
        email: iAmCaptain ? null : captainEmail,
        phone: iAmCaptain ? null : captainPhone,
        displayName: iAmCaptain ? null : captainDisplay,
      });
      if (result.error) {
        if ('needsName' in result && result.needsName) setNeedsName(true);
        toast.error(result.error);
        return;
      }
      toast.success(
        result.qrSlug ? `Team created · QR: /t/${result.qrSlug}` : 'Team created'
      );
      setOpen(false);
      form.reset();
      setIAmCaptain(true);
      setCaptainEmail('');
      setCaptainPhone('');
      setCaptainDisplay('');
      router.refresh();
    });
  }

  function onEnterExisting() {
    if (!selectedGlobalId) {
      toast.error('Pick a team');
      return;
    }
    setNeedsName(false);
    startTransition(async () => {
      const result = await enterGlobalTeamInTournament({
        tournamentId,
        globalTeamId: selectedGlobalId,
        captainPersonId: addNewCaptain ? null : selectedMemberId,
        captainContact: addNewCaptain
          ? {
              email: captainEmail,
              phone: captainPhone,
              displayName: captainDisplay,
            }
          : undefined,
      });
      if (result.error) {
        if ('needsName' in result && result.needsName) setNeedsName(true);
        toast.error(result.error);
        return;
      }
      toast.success('Team entered — tournament captain set');
      setOpen(false);
      setSelectedGlobalId(null);
      setSelectedMemberId(null);
      setAddNewCaptain(false);
      router.refresh();
    });
  }

  function onInviteCaptain(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteCaptainByEmail({
        tournamentId,
        email: inviteEmail,
        displayName: inviteDisplay || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.claimed
          ? 'Captain invited — they already have an account'
          : 'Captain registered — they can claim with this email'
      );
      setInviteEmail('');
      setInviteDisplay('');
      setOpen(false);
      router.refresh();
    });
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: 'create', label: 'Create new' },
    { id: 'my', label: 'My teams' },
    { id: 'search', label: 'Search' },
    { id: 'captain', label: 'Invite captain' },
  ];

  const captainFields = (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Tournament captain</p>
      {!addNewCaptain && members.length > 0 && (
        <ul className="max-h-36 space-y-1 overflow-y-auto">
          {members.map((m) => {
            const p = personOf(m);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMemberId(m.person_id);
                    setAddNewCaptain(false);
                  }}
                  className={
                    selectedMemberId === m.person_id
                      ? 'w-full rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-left text-sm text-foreground'
                      : 'w-full rounded-md border border-border px-2 py-1.5 text-left text-sm text-muted-foreground'
                  }
                >
                  {p?.display_name || 'Player'}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {p?.primary_email || p?.primary_phone || m.role}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={addNewCaptain}
          onChange={(e) => {
            setAddNewCaptain(e.target.checked);
            if (e.target.checked) setSelectedMemberId(null);
          }}
        />
        Add a new captain by email / phone
      </label>
      {addNewCaptain && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={captainEmail}
              onChange={(e) => setCaptainEmail(e.target.value)}
              className="border-border bg-muted text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground">Phone</Label>
            <Input
              value={captainPhone}
              onChange={(e) => setCaptainPhone(e.target.value)}
              className="border-border bg-muted text-foreground"
            />
          </div>
          {(needsName || true) && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-muted-foreground">
                Name {needsName ? '(required — not registered yet)' : '(if new)'}
              </Label>
              <Input
                value={captainDisplay}
                onChange={(e) => setCaptainDisplay(e.target.value)}
                className="border-border bg-muted text-foreground"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground size-9 sm:size-auto sm:h-10 sm:px-4"
            aria-label="Add Team"
          />
        }
      >
        <Plus className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Add Team</span>
      </DialogTrigger>
      <DialogContent className="border-border bg-card max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add team to tournament</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Captains are identified by email/phone. Tournament captain can differ from the
            global team captain.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 overflow-x-auto px-1">
          <SegmentedTabs
            size="sm"
            aria-label="Add team method"
            value={mode}
            onValueChange={(id) => {
              setMode(id);
              setSelectedGlobalId(null);
              setNeedsName(false);
            }}
            items={tabs}
          />
        </div>

        {mode === 'create' && (
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Name *</Label>
                <Input {...form.register('name')} className="border-border bg-muted text-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Short *</Label>
                <Input {...form.register('short_name')} className="border-border bg-muted text-foreground" />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={iAmCaptain}
                  onChange={(e) => setIAmCaptain(e.target.checked)}
                />
                I am the captain (global + this tournament)
              </label>
              {!iAmCaptain && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Captain email</Label>
                    <Input
                      type="email"
                      value={captainEmail}
                      onChange={(e) => setCaptainEmail(e.target.value)}
                      className="border-border bg-muted text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Captain phone</Label>
                    <Input
                      value={captainPhone}
                      onChange={(e) => setCaptainPhone(e.target.value)}
                      className="border-border bg-muted text-foreground"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-muted-foreground">
                      Name {needsName ? '(required — not registered)' : '(if new)'}
                    </Label>
                    <Input
                      value={captainDisplay}
                      onChange={(e) => setCaptainDisplay(e.target.value)}
                      className="border-border bg-muted text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Purse</Label>
                <Input type="number" {...form.register('initial_purse', { valueAsNumber: true })} className="border-border bg-muted text-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Max roster</Label>
                <Input type="number" {...form.register('max_roster_size', { valueAsNumber: true })} className="border-border bg-muted text-foreground" />
              </div>
            </div>
            <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & enter
            </Button>
          </form>
        )}

        {(mode === 'my' || mode === 'search') && (
          <div className="space-y-3 pt-2">
            {mode === 'search' && (
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search teams by name…"
                className="border-border bg-muted text-foreground"
              />
            )}
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {(mode === 'my' ? myTeams : searchResults).map((team) => (
                <li key={team.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGlobalId(team.id);
                      setSelectedMemberId(null);
                      setAddNewCaptain(false);
                    }}
                    className={
                      selectedGlobalId === team.id
                        ? 'w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-left text-sm text-foreground'
                        : 'w-full rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground hover:border-border'
                    }
                  >
                    <span className="font-medium">{team.name}</span>
                    {team.short_name && (
                      <span className="ml-2 text-xs text-muted-foreground">{team.short_name}</span>
                    )}
                  </button>
                </li>
              ))}
              {(mode === 'my' ? myTeams : searchResults).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {pending ? 'Loading…' : mode === 'my' ? 'No teams yet — create one.' : 'No matches.'}
                </p>
              )}
            </ul>
            {selectedGlobalId && captainFields}
            <Button
              type="button"
              disabled={pending}
              onClick={onEnterExisting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enter team
            </Button>
          </div>
        )}

        {mode === 'captain' && (
          <form onSubmit={onInviteCaptain} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Captain email *</Label>
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="border-border bg-muted text-foreground"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Name (if new)</Label>
              <Input
                value={inviteDisplay}
                onChange={(e) => setInviteDisplay(e.target.value)}
                className="border-border bg-muted text-foreground"
              />
            </div>
            <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send invite
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
