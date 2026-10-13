'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { auctionSchema, AuctionFormData } from '@/lib/validation/schemas';
import { createAuction } from '@/app/(dashboard)/dashboard/auctions/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateAuctionFormProps {
  tournamentId: string;
  tournamentName: string;
}

export function CreateAuctionForm({ tournamentId, tournamentName }: CreateAuctionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuctionFormData>({
    resolver: zodResolver(auctionSchema),
    defaultValues: {
      currency_code: 'INR',
      default_bid_increment: 100000,
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
      toast.success('Auction created successfully');
      router.push(`/dashboard/auctions/${result.auctionId}/control`);
    } catch {
      toast.error('Failed to create auction');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/80 max-w-lg">
      <CardHeader>
        <CardTitle className="text-white">Create New Auction</CardTitle>
        <CardDescription className="text-slate-400">
          For {tournamentName}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              <Label className="text-slate-300">Default Bid Increment (₹)</Label>
              <Input
                type="number"
                {...register('default_bid_increment', { valueAsNumber: true })}
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Auction & Add All Players
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
