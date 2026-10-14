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

export function PlayersTable({ tournamentId, players }: PlayersTableProps) {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
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
                  <Badge
                    variant="outline"
                    className={
                      player.status === 'sold'
                        ? 'border-green-600 text-green-400'
                        : player.status === 'unsold'
                          ? 'border-red-600 text-red-400'
                          : player.status === 'in_auction'
                            ? 'border-yellow-600 text-yellow-400'
                            : 'border-slate-600 text-slate-400'
                    }
                  >
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
