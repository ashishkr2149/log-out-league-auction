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
  if (status === 'sold') return 'border-green-600 text-green-400';
  if (status === 'unsold') return 'border-red-600 text-red-400';
  if (status === 'in_auction') return 'border-yellow-600 text-yellow-400';
  return 'border-slate-600 text-slate-400';
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
            className="w-full text-left px-3 py-3 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0 w-5">
                    {player.auction_order ?? i + 1}
                  </span>
                  <span className="font-medium text-white truncate">{player.name}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-7">
                  <Badge variant="outline" className="border-slate-600 text-slate-300 text-[10px]">
                    {getRoleLabel(player.role)}
                  </Badge>
                  <span className="text-xs text-slate-500 font-mono">
                    {formatCurrency(player.base_price)}
                  </span>
                  {player.category ? (
                    <span className="text-xs text-slate-500 truncate">{player.category}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={statusBadgeClass(player.status)}>
                  {getPlayerStatusLabel(player.status)}
                </Badge>
                <Pencil className="h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">#</TableHead>
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Role</TableHead>
              <TableHead className="text-slate-400">Base Price</TableHead>
              <TableHead className="text-slate-400">Category</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400 w-10" />
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
                className="border-slate-800 cursor-pointer hover:bg-slate-800/60 focus-visible:bg-slate-800/60 focus-visible:outline-none"
              >
                <TableCell className="text-slate-500">{player.auction_order ?? i + 1}</TableCell>
                <TableCell>
                  <div>
                    <span className="font-medium text-white">{player.name}</span>
                    {player.jersey_number && (
                      <span className="ml-2 text-xs text-slate-500">#{player.jersey_number}</span>
                    )}
                  </div>
                  {player.display_name !== player.name && (
                    <span className="text-xs text-slate-500">{player.display_name}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {getRoleLabel(player.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-white font-mono text-sm">
                  {formatCurrency(player.base_price)}
                </TableCell>
                <TableCell className="text-slate-400">{player.category ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusBadgeClass(player.status)}>
                    {getPlayerStatusLabel(player.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
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
