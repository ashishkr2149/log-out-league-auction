'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { bootstrapPlatformOwner } from '@/lib/auth/platform';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function BootstrapOwnerButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const result = await bootstrapPlatformOwner();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('You are now the platform owner');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Become platform owner
    </Button>
  );
}
