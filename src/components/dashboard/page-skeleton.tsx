import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg bg-slate-800" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-48 sm:w-72 bg-slate-800" />
          <Skeleton className="h-4 w-32 sm:w-48 bg-slate-800" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 sm:h-28 rounded-xl bg-slate-800" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />
        ))}
      </div>

      <div className="space-y-3 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg bg-slate-800" />
        ))}
      </div>
    </div>
  );
}
