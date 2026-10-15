import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type TournamentListItem = {
  id: string;
  name: string;
  season: string;
  status: string;
  accessMode: string;
  description?: string | null;
  primaryColor: string;
  secondaryColor: string;
};

export function TournamentListCards({ items }: { items: TournamentListItem[] }) {
  if (items.length === 0) {
    return <p className="caption py-10 text-center">Nothing here yet.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((tournament) => (
        <Link key={tournament.id} href={`/dashboard/tournaments/${tournament.id}`}>
          <div className="panel flex h-full flex-col gap-3 p-4 transition-colors hover:bg-muted/40">
            <div className="flex items-start justify-between gap-2">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: tournament.primaryColor + '22' }}
              >
                <Trophy className="h-5 w-5" style={{ color: tournament.secondaryColor }} />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="rounded-full capitalize">
                  {tournament.status}
                </Badge>
                <Badge variant="outline" className="rounded-full capitalize">
                  {tournament.accessMode}
                </Badge>
              </div>
            </div>
            <div>
              <h2 className="section-title">{tournament.name}</h2>
              <p className="caption mt-0.5">Season {tournament.season}</p>
            </div>
            <p className="caption line-clamp-2">
              {tournament.description || 'No description'}
            </p>
            <div className="mt-auto flex items-center text-sm font-medium text-primary">
              Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
