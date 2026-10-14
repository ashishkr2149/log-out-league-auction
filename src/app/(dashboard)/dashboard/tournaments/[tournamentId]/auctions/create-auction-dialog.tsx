'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { auctionSchema, AuctionFormData } from '@/lib/validation/schemas';
import { createAuction } from '@/app/(dashboard)/dashboard/auctions/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateAuctionDialogProps {
  tournamentId: string;
  tournamentName: string;
}

export function CreateAuctionDialog({ tournamentId, tournamentName }: CreateAuctionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuctionFormData>({
    resolver: zodResolver(auctionSchema),
    defaultValues: {
      currency_code: 'INR',
      default_bid_increment: 1,
    },
  });

  async function onSubmit(data: AuctionFormData) {
    setIsSubmitting(true);
    try {
      const result = await createAuction(tournamentId, data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Auction created');
      setOpen(false);
      reset({ name: '', currency_code: 'INR', default_bid_increment: 1 });
      router.push(`/dashboard/auctions/${result.auctionId}/control`);
      router.refresh();
    } catch {
      toast.error('Failed to create auction');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            className="bg-red-600 hover:bg-red-700 text-white size-9 sm:size-auto sm:h-10 sm:px-4"
            aria-label="New Auction"
          />
        }
      >
        <Plus className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">New Auction</span>
      </DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Auction</DialogTitle>
          <DialogDescription className="text-slate-400">
            For {tournamentName}. All registered players will be queued automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Auction Name *</Label>
            <Input
              {...register('name')}
              placeholder="e.g., Main Player Auction"
              className="border-slate-700 bg-slate-800 text-white"
            />
            {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Currency</Label>
              <Input
                {...register('currency_code')}
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Bid Increment</Label>
              <Input
                type="number"
                {...register('default_bid_increment', { valueAsNumber: true })}
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Auction
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
