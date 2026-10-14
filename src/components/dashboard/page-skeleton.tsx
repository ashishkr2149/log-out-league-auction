import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 sm:w-64" />
          <Skeleton className="h-4 w-28 sm:w-48" />
        </div>
      </div>
      {withAction ? <Skeleton className="h-10 w-28 rounded-lg shrink-0 hidden sm:block" /> : null}
    </div>
  );
}

/** Tournament overview: 4 stats + 3 manage cards */
export function TournamentDetailSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <PageHeaderSkeleton />

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900/80">
            <CardContent className="flex flex-col items-center justify-center gap-2 px-1.5 py-3 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-4 sm:py-4 sm:text-left">
              <Skeleton className="h-5 w-5 sm:h-7 sm:w-7 rounded-md shrink-0" />
              <div className="space-y-1.5 w-full sm:w-auto flex flex-col items-center sm:items-start">
                <Skeleton className="h-3 w-10 sm:w-14" />
                <Skeleton className="h-6 w-8 sm:h-7 sm:w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900/80">
            <CardHeader className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Teams grid */
export function TeamsPageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeaderSkeleton withAction />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-12" />
                </div>
              ))}
              <div className="h-px bg-slate-800" />
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Team squad detail */
export function TeamDetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-lg shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-900/30 bg-yellow-950/10 px-3 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-4" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** Players table */
export function PlayersPageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeaderSkeleton withAction />

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-6 gap-3 border-b border-slate-800 px-4 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full max-w-[4rem]" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-3 items-center border-b border-slate-800/80 px-4 py-3.5 last:border-0"
          >
            <Skeleton className="h-3.5 w-6" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3.5 w-10" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Single auction page */
export function AuctionPageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeaderSkeleton withAction />
      <Card className="border-slate-800 bg-slate-900/80 max-w-xl">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Tournaments list */
export function TournamentsListSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900/80">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-28 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Dashboard home */
export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900/80">
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-7 w-7 rounded-md" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Auction control / results fallback */
export function AuctionWorkspaceSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <PageHeaderSkeleton withAction />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/80 lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** @deprecated Prefer page-specific skeletons */
export function PageSkeleton() {
  return <TournamentDetailSkeleton />;
}
