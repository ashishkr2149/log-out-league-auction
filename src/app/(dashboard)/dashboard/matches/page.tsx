import Link from 'next/link';
import { Swords } from 'lucide-react';

export default function MatchesStubPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
        <Swords className="h-7 w-7" />
      </span>
      <h1 className="page-title">Matches</h1>
      <p className="caption max-w-sm">
        Casual matches are coming soon. For now, jump into your teams or a tournament auction.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/dashboard/teams"
          className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          My teams
        </Link>
        <Link
          href="/dashboard/tournaments"
          className="inline-flex h-10 items-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Tournaments
        </Link>
      </div>
    </div>
  );
}
