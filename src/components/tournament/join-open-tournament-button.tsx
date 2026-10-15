'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { joinOpenTournament } from '@/app/(dashboard)/dashboard/tournaments/actions';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function JoinOpenTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      className="bg-primary hover:bg-primary/90 text-primary-foreground"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await joinOpenTournament(tournamentId);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(
            result.alreadyMember ? 'You already have access' : 'Joined as spectator'
          );
          router.refresh();
        });
      }}
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Join as spectator
    </Button>
  );
}
