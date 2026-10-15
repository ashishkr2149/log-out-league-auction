'use client';

import { useState } from 'react';
import type { Player } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, getRoleLabel, getPlayerStatusLabel } from '@/lib/auction/validation';
import { EditPlayerDialog } from './edit-player-dialog';
import { Pencil } from 'lucide-react';

interface PlayersTableProps {
  tournamentId: string;
  players: Player[];
}

function statusBadgeClass(status: Player['status']) {
  if (status === 'sold') return 'border-emerald-600 text-emerald-600';
  if (status === 'unsold') return 'border-red-600 text-primary';
  if (status === 'in_auction') return 'border-yellow-600 text-amber-600';
  return 'border-border text-muted-foreground';
}

export function PlayersTable({ tournamentId, players }: PlayersTableProps) {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  return (
    <>
      {/* Mobile: compact cards */}
      <div className="md:hidden divide-y divide-slate-800">
        {players.map((player, i) => (
          <button
            key={player.id}
            type="button"
            onClick={() => setEditingPlayer(player)}
            className="w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0 w-5">
                    {player.auction_order ?? i + 1}
                  </span>
                  <span className="font-medium text-foreground truncate">{player.name}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-7">
                  <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                    {getRoleLabel(player.role)}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatCurrency(player.base_price)}
                  </span>
                  {player.category ? (
                    <span className="text-xs text-muted-foreground truncate">{player.category}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={statusBadgeClass(player.status)}>
                  {getPlayerStatusLabel(player.status)}
                </Badge>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">#</TableHead>
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Role</TableHead>
              <TableHead className="text-muted-foreground">Base Price</TableHead>
              <TableHead className="text-muted-foreground">Category</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player, i) => (
              <TableRow
                key={player.id}
                role="button"
                tabIndex={0}
                onClick={() => setEditingPlayer(player)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setEditingPlayer(player);
                  }
                }}
                className="border-border cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
              >
                <TableCell className="text-muted-foreground">{player.auction_order ?? i + 1}</TableCell>
                <TableCell>
                  <div>
                    <span className="font-medium text-foreground">{player.name}</span>
                    {player.jersey_number && (
                      <span className="ml-2 text-xs text-muted-foreground">#{player.jersey_number}</span>
                    )}
                  </div>
                  {player.display_name !== player.name && (
                    <span className="text-xs text-muted-foreground">{player.display_name}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {getRoleLabel(player.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground font-mono text-sm">
                  {formatCurrency(player.base_price)}
                </TableCell>
                <TableCell className="text-muted-foreground">{player.category ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusBadgeClass(player.status)}>
                    {getPlayerStatusLabel(player.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingPlayer && (
        <EditPlayerDialog
          tournamentId={tournamentId}
          player={editingPlayer}
          open={Boolean(editingPlayer)}
          onOpenChange={(open) => {
            if (!open) setEditingPlayer(null);
          }}
        />
      )}
    </>
  );
}
