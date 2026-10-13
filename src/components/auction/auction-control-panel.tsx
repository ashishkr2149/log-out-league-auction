'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  transitionAuctionStatus,
  nominatePlayer,
  startBidding,
  placeBid,
  sellPlayer,
  markUnsold,
  undoLastSale,
} from '@/lib/auction/actions';
import { formatCurrency, getRoleLabel, getAuctionStatusLabel } from '@/lib/auction/validation';
import type {
  Auction,
  Player,
  Team,
  TeamWithStats,
  AuctionPlayer,
  AuctionEvent,
  AuctionPurchase,
  AuctionStatus,
} from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Gavel,
  Play,
  Pause,
  Check,
  X,
  SkipForward,
  Undo2,
  Loader2,
  WifiOff,
  Wifi,
  User,
  ChevronUp,
  Flag,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface AuctionControlPanelProps {
  auction: Auction & { tournament: { id: string; name: string; primary_color: string; secondary_color: string } };
  teams: TeamWithStats[];
  auctionPlayers: (AuctionPlayer & { player: Player })[];
  currentPlayer: Player | null;
  currentTeam: Team | null;
  recentEvents: AuctionEvent[];
  lastPurchase: AuctionPurchase | null;
}

export function AuctionControlPanel({
  auction: initialAuction,
  teams: initialTeams,
  auctionPlayers: initialAuctionPlayers,
  currentPlayer: initialCurrentPlayer,
  currentTeam: initialCurrentTeam,
  recentEvents: initialRecentEvents,
  lastPurchase: initialLastPurchase,
}: AuctionControlPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState(initialAuction.state_version);
  const [phase, setPhase] = useState(initialAuction.current_phase);
  const [status, setStatus] = useState(initialAuction.status);
  const [currentBid, setCurrentBid] = useState(initialAuction.current_bid_amount);
  const [currentTeamId, setCurrentTeamId] = useState(initialAuction.current_bid_team_id);
  const [connected, setConnected] = useState(true);
  const [selectedTeamForBid, setSelectedTeamForBid] = useState<string | null>(
    initialAuction.current_bid_team_id
  );

  // Queue of unprocessed players
  const queuedPlayers = initialAuctionPlayers.filter((ap) => ap.status === 'queued');
  const soldPlayers = initialAuctionPlayers.filter((ap) => ap.status === 'sold');

  // Find current auction player
  const currentAuctionPlayer = initialAuctionPlayers.find(
    (ap) => ap.player_id === initialAuction.current_player_id
  );

  // Subscribe to realtime updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`auction-${initialAuction.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${initialAuction.id}`,
        },
        (payload) => {
          const updated = payload.new as Auction;
          setStateVersion(updated.state_version);
          setPhase(updated.current_phase);
          setStatus(updated.status);
          setCurrentBid(updated.current_bid_amount);
          setCurrentTeamId(updated.current_bid_team_id);
          // Refresh the page data
          router.refresh();
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialAuction.id, router]);

  const handleAction = useCallback(
    async (
      actionName: string,
      action: () => Promise<{ success?: boolean; error?: string; newVersion?: number }>
    ) => {
      if (isLoading) return;
      setIsLoading(actionName);

      try {
        const result = await action();
        if (result.error) {
          toast.error(result.error);
          if (result.error.includes('state has changed') || result.error.includes('refresh')) {
            router.refresh();
          }
        } else {
          if (result.newVersion) {
            setStateVersion(result.newVersion);
          }
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Action failed');
      } finally {
        setIsLoading(null);
      }
    },
    [isLoading, router]
  );

  const bidAmount = currentBid
    ? currentBid + initialAuction.default_bid_increment
    : currentAuctionPlayer?.base_price ?? initialAuction.default_bid_increment;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/tournaments/${initialAuction.tournament_id}`}>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{initialAuction.name}</h1>
            <p className="text-sm text-slate-400">{initialAuction.tournament?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/auctions/${initialAuction.id}/settings`}>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
              Settings
            </Button>
          </Link>
          <Link href={`/dashboard/auctions/${initialAuction.id}/overlay-preview`}>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
              Overlay
            </Button>
          </Link>
          {connected ? (
            <Badge variant="outline" className="border-green-600 text-green-400">
              <Wifi className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="border-red-600 text-red-400">
              <WifiOff className="mr-1 h-3 w-3" />
              Disconnected
            </Badge>
          )}
          <Badge
            variant="outline"
            className={
              status === 'live'
                ? 'border-green-600 text-green-400 text-base px-3 py-1'
                : status === 'paused'
                  ? 'border-yellow-600 text-yellow-400 text-base px-3 py-1'
                  : 'border-slate-600 text-slate-400 text-base px-3 py-1'
            }
          >
            {getAuctionStatusLabel(status)}
          </Badge>
        </div>
      </div>

      {/* Main Control Layout */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* LEFT: Current Player */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Current Player
              </CardTitle>
            </CardHeader>
            <CardContent>
              {initialCurrentPlayer ? (
                <div className="space-y-4">
                  {/* Player photo placeholder */}
                  <div className="flex justify-center">
                    <div className="h-32 w-32 rounded-xl bg-slate-800 flex items-center justify-center ring-2 ring-slate-700">
                      {initialCurrentPlayer.photo_path ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/player-photos/${initialCurrentPlayer.photo_path}`}
                          alt={initialCurrentPlayer.name}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        <User className="h-16 w-16 text-slate-600" />
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <h2 className="text-xl font-bold text-white">
                      {initialCurrentPlayer.display_name}
                    </h2>
                    {initialCurrentPlayer.jersey_number && (
                      <span className="text-sm text-slate-400">#{initialCurrentPlayer.jersey_number}</span>
                    )}
                    <div className="mt-2">
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {getRoleLabel(initialCurrentPlayer.role)}
                      </Badge>
                    </div>
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Base Price</span>
                      <span className="font-medium text-white">
                        {formatCurrency(currentAuctionPlayer?.base_price ?? initialCurrentPlayer.base_price)}
                      </span>
                    </div>
                    {currentBid && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Current Bid</span>
                        <span className="text-2xl font-bold text-green-400">
                          {formatCurrency(currentBid)}
                        </span>
                      </div>
                    )}
                    {currentTeamId && initialTeams && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Leading Team</span>
                        <span className="font-bold" style={{
                          color: initialTeams.find((t) => t.id === currentTeamId)?.primary_color ?? '#fff'
                        }}>
                          {initialTeams.find((t) => t.id === currentTeamId)?.name ?? 'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>

                  <Badge
                    className={
                      phase === 'bidding'
                        ? 'bg-green-600 text-white w-full justify-center py-1'
                        : phase === 'sold'
                          ? 'bg-blue-600 text-white w-full justify-center py-1'
                          : phase === 'unsold'
                            ? 'bg-red-600 text-white w-full justify-center py-1'
                            : 'bg-slate-700 text-white w-full justify-center py-1'
                    }
                  >
                    {phase.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <User className="h-16 w-16 text-slate-700 mb-3" />
                  <p className="text-slate-500">No player selected</p>
                  <p className="text-xs text-slate-600 mt-1">Select a player to begin</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CENTER: Bid Controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Auction Status Controls */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Auction Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Status transitions */}
              {status === 'draft' && (
                <Button
                  onClick={() => handleAction('ready', () => transitionAuctionStatus(initialAuction.id, 'ready', stateVersion))}
                  disabled={!!isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading === 'ready' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mark as Ready
                </Button>
              )}
              {status === 'ready' && (
                <Button
                  onClick={() => handleAction('start', () => transitionAuctionStatus(initialAuction.id, 'live', stateVersion))}
                  disabled={!!isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                >
                  {isLoading === 'start' ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-5 w-5" />
                  )}
                  Start Auction
                </Button>
              )}
              {status === 'live' && (
                <Button
                  onClick={() => handleAction('pause', () => transitionAuctionStatus(initialAuction.id, 'paused', stateVersion))}
                  disabled={!!isLoading}
                  variant="outline"
                  className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-600/10"
                >
                  {isLoading === 'pause' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="mr-2 h-4 w-4" />
                  )}
                  Pause Auction
                </Button>
              )}
              {status === 'paused' && (
                <Button
                  onClick={() => handleAction('resume', () => transitionAuctionStatus(initialAuction.id, 'live', stateVersion))}
                  disabled={!!isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading === 'resume' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Resume Auction
                </Button>
              )}

              {/* Bidding Controls - only when auction is live */}
              {(status === 'live' || status === 'paused') && (
                <>
                  <Separator className="bg-slate-800" />

                  {/* Start bidding for nominated player */}
                  {phase === 'player_intro' && status === 'live' && (
                    <Button
                      onClick={() => handleAction('startBid', () => startBidding(initialAuction.id, stateVersion))}
                      disabled={!!isLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                    >
                      {isLoading === 'startBid' ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Gavel className="mr-2 h-5 w-5" />
                      )}
                      Start Bidding
                    </Button>
                  )}

                  {/* Bid controls */}
                  {phase === 'bidding' && status === 'live' && (
                    <div className="space-y-3">
                      {/* Team selector */}
                      <div>
                        <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                          Bidding Team
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {initialTeams.map((team) => (
                            <Button
                              key={team.id}
                              variant={selectedTeamForBid === team.id ? 'default' : 'outline'}
                              onClick={() => setSelectedTeamForBid(team.id)}
                              className={
                                selectedTeamForBid === team.id
                                  ? 'text-white font-bold'
                                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                              }
                              style={
                                selectedTeamForBid === team.id
                                  ? { backgroundColor: team.primary_color }
                                  : undefined
                              }
                              disabled={
                                team.remaining_purse < bidAmount ||
                                team.roster_count >= team.max_roster_size
                              }
                            >
                              <span className="truncate text-sm">{team.short_name}</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Bid amount */}
                      <div>
                        <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                          Place Bid
                        </p>
                        <Button
                          onClick={() => {
                            if (!selectedTeamForBid) {
                              toast.error('Select a team first');
                              return;
                            }
                            handleAction('bid', () =>
                              placeBid(initialAuction.id, selectedTeamForBid, bidAmount, stateVersion)
                            );
                          }}
                          disabled={!!isLoading || !selectedTeamForBid}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                        >
                          {isLoading === 'bid' ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <ChevronUp className="mr-2 h-5 w-5" />
                          )}
                          Bid {formatCurrency(bidAmount)}
                        </Button>
                      </div>

                      <Separator className="bg-slate-800" />

                      {/* Sell / Unsold */}
                      <div className="grid grid-cols-2 gap-3">
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                disabled={!!isLoading || !currentTeamId}
                                className="bg-blue-600 hover:bg-blue-700 text-white py-6"
                              />
                            }
                          >
                            <Check className="mr-2 h-5 w-5" />
                            SOLD
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-slate-800 bg-slate-900">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Confirm Sale</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Sell <strong className="text-white">{initialCurrentPlayer?.display_name}</strong> to{' '}
                                <strong className="text-white">
                                  {initialTeams.find((t) => t.id === currentTeamId)?.name}
                                </strong>{' '}
                                for <strong className="text-green-400">{formatCurrency(currentBid ?? 0)}</strong>?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleAction('sell', () => sellPlayer(initialAuction.id, stateVersion))}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Confirm Sale
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                disabled={!!isLoading}
                                variant="outline"
                                className="border-red-600 text-red-400 hover:bg-red-600/10 py-6"
                              />
                            }
                          >
                            <X className="mr-2 h-5 w-5" />
                            UNSOLD
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-slate-800 bg-slate-900">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Mark as Unsold</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Mark <strong className="text-white">{initialCurrentPlayer?.display_name}</strong> as unsold?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleAction('unsold', () => markUnsold(initialAuction.id, stateVersion))}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Confirm Unsold
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}

                  {/* Next player / Advance */}
                  {(phase === 'sold' || phase === 'unsold' || phase === 'standby') && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">
                        Player Queue ({queuedPlayers.length} remaining)
                      </p>
                      {queuedPlayers.length > 0 ? (
                        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                          {queuedPlayers.map((ap) => (
                            <Button
                              key={ap.id}
                              variant="outline"
                              onClick={() =>
                                handleAction(`nominate-${ap.id}`, () =>
                                  nominatePlayer(initialAuction.id, ap.id, stateVersion)
                                )
                              }
                              disabled={!!isLoading}
                              className="w-full justify-start border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                              {isLoading === `nominate-${ap.id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <SkipForward className="mr-2 h-4 w-4" />
                              )}
                              <span className="truncate">
                                #{ap.auction_order} {ap.player?.display_name ?? 'Unknown'}
                              </span>
                              <span className="ml-auto text-xs text-slate-500">
                                {formatCurrency(ap.base_price)}
                              </span>
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Flag className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No more players in queue</p>
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  variant="outline"
                                  className="mt-3 border-red-600 text-red-400"
                                />
                              }
                            >
                              Complete Auction
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-slate-800 bg-slate-900">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Complete Auction</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  This will mark the auction as completed. Are you sure?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleAction('complete', () =>
                                      transitionAuctionStatus(initialAuction.id, 'completed', stateVersion)
                                    )
                                  }
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Complete Auction
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Undo last sale */}
                  {initialLastPurchase && (
                    <>
                      <Separator className="bg-slate-800" />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!!isLoading}
                              className="w-full border-slate-700 text-slate-400 hover:bg-slate-800"
                            />
                          }
                        >
                          <Undo2 className="mr-2 h-3 w-3" />
                          Undo Last Sale
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-slate-800 bg-slate-900">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Undo Last Sale</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              This will reverse the most recent sale, restore the team&apos;s purse, and
                              remove the player from their roster. This action is recorded in the audit log.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleAction('undo', () =>
                                  undoLastSale(initialAuction.id, initialLastPurchase.id, stateVersion)
                                )
                              }
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Confirm Undo
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Teams & Events */}
        <div className="lg:col-span-4 space-y-4">
          {/* Team Purse Overview */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Team Purses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {initialTeams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
                        >
                          {team.short_name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{team.short_name}</p>
                          <p className="text-xs text-slate-500">
                            {team.roster_count}/{team.max_roster_size} players
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-400">
                          {formatCurrency(team.remaining_purse)}
                        </p>
                        <p className="text-xs text-slate-500">
                          of {formatCurrency(team.initial_purse)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {initialRecentEvents.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No events yet</p>
                  ) : (
                    initialRecentEvents.slice(0, 10).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-2 text-xs border-b border-slate-800/50 pb-2"
                      >
                        <span className="text-slate-600 shrink-0">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </span>
                        <span className="text-slate-400">
                          {event.event_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Sold Players */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Sold ({soldPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {soldPlayers.map((ap) => (
                    <div
                      key={ap.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-white">{ap.player?.display_name}</span>
                      <span className="text-green-400 font-mono">
                        {formatCurrency(ap.final_sale_price ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
