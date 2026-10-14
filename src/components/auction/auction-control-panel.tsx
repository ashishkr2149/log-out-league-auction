'use client';

import { useState, useCallback, useEffect, useEffectEvent } from 'react';
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
  undoLastBid,
  type AuctionActionResult,
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
  AuctionPhase,
} from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Plus,
  Flag,
  ArrowLeft,
  Settings,
  MonitorPlay,
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
  recentEvents: initialRecentEvents,
  lastPurchase: initialLastPurchase,
}: AuctionControlPanelProps) {
  const router = useRouter();
  const currency = initialAuction.currency_code || 'PTS';
  const increment = initialAuction.default_bid_increment || 1;

  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState(initialAuction.state_version);
  const [phase, setPhase] = useState<AuctionPhase>(initialAuction.current_phase);
  const [status, setStatus] = useState<AuctionStatus>(initialAuction.status);
  const [currentBid, setCurrentBid] = useState<number | null>(initialAuction.current_bid_amount);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(initialAuction.current_bid_team_id);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(initialAuction.current_player_id);
  const [connected, setConnected] = useState(true);
  const [selectedTeamForBid, setSelectedTeamForBid] = useState<string | null>(
    initialAuction.current_bid_team_id
  );
  const [customBid, setCustomBid] = useState('');

  const applyActionState = useEffectEvent((result: Extract<AuctionActionResult, { success: true }>) => {
    setStateVersion(result.newVersion);
    setPhase(result.phase);
    setStatus(result.status);
    setCurrentBid(result.currentBid);
    setCurrentTeamId(result.currentTeamId);
    setCurrentPlayerId(result.currentPlayerId);
    if (result.currentTeamId) {
      setSelectedTeamForBid(result.currentTeamId);
    }
  });

  // Keep local control state in sync when server props refresh
  useEffect(() => {
    setStateVersion(initialAuction.state_version);
    setPhase(initialAuction.current_phase);
    setStatus(initialAuction.status);
    setCurrentBid(initialAuction.current_bid_amount);
    setCurrentTeamId(initialAuction.current_bid_team_id);
    setCurrentPlayerId(initialAuction.current_player_id);
    if (initialAuction.current_bid_team_id) {
      setSelectedTeamForBid(initialAuction.current_bid_team_id);
    }
  }, [
    initialAuction.state_version,
    initialAuction.current_phase,
    initialAuction.status,
    initialAuction.current_bid_amount,
    initialAuction.current_bid_team_id,
    initialAuction.current_player_id,
  ]);

  const queuedPlayers = initialAuctionPlayers.filter((ap) => ap.status === 'queued');
  const soldPlayers = initialAuctionPlayers.filter((ap) => ap.status === 'sold');

  const currentAuctionPlayer = initialAuctionPlayers.find(
    (ap) => ap.player_id === currentPlayerId
  );
  const currentPlayer =
    initialCurrentPlayer?.id === currentPlayerId
      ? initialCurrentPlayer
      : currentAuctionPlayer?.player ?? initialCurrentPlayer;

  const basePrice = currentAuctionPlayer?.base_price ?? currentPlayer?.base_price ?? increment;
  const hasLeadingTeam = Boolean(currentTeamId);
  // First team bid can match opening/base; later bids add the default increment
  const plusOneAmount = hasLeadingTeam
    ? (currentBid ?? basePrice) + increment
    : (currentBid ?? basePrice);

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
          setCurrentPlayerId(updated.current_player_id);
          router.refresh();
        }
      )
      .subscribe((subStatus) => {
        setConnected(subStatus === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialAuction.id, router]);

  const handleAction = useCallback(
    async (
      actionName: string,
      action: () => Promise<AuctionActionResult>,
      successMessage?: string
    ) => {
      if (isLoading) return;
      setIsLoading(actionName);

      try {
        const result = await action();
        if ('error' in result && result.error) {
          toast.error(result.error);
          router.refresh();
          return;
        }
        if (result.success) {
          applyActionState(result);
          if (successMessage) toast.success(successMessage);
          setCustomBid('');
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

  const placeTeamBid = (amount: number) => {
    if (!selectedTeamForBid) {
      toast.error('Select a team first');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid bid amount');
      return;
    }
    handleAction(
      'bid',
      () => placeBid(initialAuction.id, selectedTeamForBid, Math.round(amount), stateVersion),
      `Bid ${formatCurrency(Math.round(amount), currency)} placed`
    );
  };

  const money = (amount: number) => formatCurrency(amount, currency);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Link href={`/dashboard/tournaments/${initialAuction.tournament_id}`} className="shrink-0">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{initialAuction.name}</h1>
            <p className="text-sm text-slate-400 truncate">{initialAuction.tournament?.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
          <Link href={`/dashboard/auctions/${initialAuction.id}/settings`}>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Settings
            </Button>
          </Link>
          <Link href={`/dashboard/auctions/${initialAuction.id}/overlay-preview`}>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
              <MonitorPlay className="mr-1.5 h-3.5 w-3.5" />
              Overlay
            </Button>
          </Link>
          {connected ? (
            <Badge variant="outline" className="border-green-600 text-green-400">
              <Wifi className="mr-1 h-3 w-3" />
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="border-red-600 text-red-400">
              <WifiOff className="mr-1 h-3 w-3" />
              Offline
            </Badge>
          )}
          <Badge
            variant="outline"
            className={
              status === 'live'
                ? 'border-green-600 text-green-400'
                : status === 'paused'
                  ? 'border-yellow-600 text-yellow-400'
                  : status === 'completed'
                    ? 'border-blue-600 text-blue-400'
                    : 'border-slate-600 text-slate-400'
            }
          >
            {getAuctionStatusLabel(status)}
          </Badge>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-red-400" />
          Working… please wait
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Current Player */}
        <div className="lg:col-span-4 space-y-4 order-1">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Current Player
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPlayer ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-xl bg-slate-800 flex items-center justify-center ring-2 ring-slate-700">
                      <User className="h-14 w-14 text-slate-600" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-white">{currentPlayer.display_name}</h2>
                    <div className="mt-2">
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {getRoleLabel(currentPlayer.role)}
                      </Badge>
                    </div>
                  </div>
                  <Separator className="bg-slate-800" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Base Price</span>
                      <span className="font-medium text-white">{money(basePrice)}</span>
                    </div>
                    {currentBid !== null && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 text-sm">
                          {hasLeadingTeam ? 'Current Bid' : 'Opening'}
                        </span>
                        <span className="text-2xl font-bold text-green-400">{money(currentBid)}</span>
                      </div>
                    )}
                    {currentTeamId && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Leading Team</span>
                        <span
                          className="font-bold"
                          style={{
                            color:
                              initialTeams.find((t) => t.id === currentTeamId)?.primary_color ?? '#fff',
                          }}
                        >
                          {initialTeams.find((t) => t.id === currentTeamId)?.name ?? 'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge className="bg-slate-700 text-white w-full justify-center py-1">
                    {phase.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <User className="h-16 w-16 text-slate-700 mb-3" />
                  <p className="text-slate-500">No player selected</p>
                  <p className="text-xs text-slate-600 mt-1">Pick a player from the queue</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="lg:col-span-4 space-y-4 order-2">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Auction Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status === 'draft' && (
                <Button
                  onClick={() =>
                    handleAction('ready', () =>
                      transitionAuctionStatus(initialAuction.id, 'ready', stateVersion)
                    , 'Auction marked ready')
                  }
                  disabled={!!isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading === 'ready' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mark as Ready
                </Button>
              )}
              {status === 'ready' && (
                <Button
                  onClick={() =>
                    handleAction('start', () =>
                      transitionAuctionStatus(initialAuction.id, 'live', stateVersion)
                    , 'Auction started')
                  }
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
                  onClick={() =>
                    handleAction('pause', () =>
                      transitionAuctionStatus(initialAuction.id, 'paused', stateVersion)
                    , 'Auction paused')
                  }
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
                  onClick={() =>
                    handleAction('resume', () =>
                      transitionAuctionStatus(initialAuction.id, 'live', stateVersion)
                    , 'Auction resumed')
                  }
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

              {(status === 'live' || status === 'paused' || status === 'ready') && (
                <>
                  <Separator className="bg-slate-800" />

                  {phase === 'player_intro' && status === 'live' && (
                    <Button
                      onClick={() =>
                        handleAction('startBid', () => startBidding(initialAuction.id, stateVersion), 'Bidding open')
                      }
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

                  {phase === 'bidding' && status === 'live' && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                          Bidding Team
                        </p>
                        <div className="grid grid-cols-3 gap-2">
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
                                team.remaining_purse < plusOneAmount ||
                                team.roster_count >= team.max_roster_size
                              }
                            >
                              <span className="truncate text-xs sm:text-sm">{team.short_name}</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Place Bid</p>
                        <Button
                          onClick={() => placeTeamBid(plusOneAmount)}
                          disabled={!!isLoading || !selectedTeamForBid}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                        >
                          {isLoading === 'bid' ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-5 w-5" />
                          )}
                          +{increment} → {money(plusOneAmount)}
                        </Button>

                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            placeholder="Custom amount"
                            value={customBid}
                            onChange={(e) => setCustomBid(e.target.value)}
                            className="border-slate-700 bg-slate-800 text-white"
                          />
                          <Button
                            onClick={() => placeTeamBid(Number(customBid))}
                            disabled={!!isLoading || !selectedTeamForBid || !customBid}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white shrink-0"
                          >
                            Bid
                          </Button>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          handleAction('undoBid', () => undoLastBid(initialAuction.id, stateVersion), 'Last bid undone')
                        }
                        disabled={!!isLoading || !hasLeadingTeam}
                        className="w-full border-slate-700 text-slate-300"
                      >
                        {isLoading === 'undoBid' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Undo2 className="mr-2 h-4 w-4" />
                        )}
                        Undo Last Bid
                      </Button>

                      <Separator className="bg-slate-800" />

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
                                Sell <strong className="text-white">{currentPlayer?.display_name}</strong> to{' '}
                                <strong className="text-white">
                                  {initialTeams.find((t) => t.id === currentTeamId)?.name}
                                </strong>{' '}
                                for <strong className="text-green-400">{money(currentBid ?? 0)}</strong>?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleAction('sell', () => sellPlayer(initialAuction.id, stateVersion), 'Player sold')
                                }
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
                                Mark <strong className="text-white">{currentPlayer?.display_name}</strong> as unsold?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleAction('unsold', () => markUnsold(initialAuction.id, stateVersion), 'Marked unsold')
                                }
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
                                  handleAction(
                                    `nominate-${ap.id}`,
                                    () => nominatePlayer(initialAuction.id, ap.id, stateVersion),
                                    `${ap.player?.display_name ?? 'Player'} selected`
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
                                  {money(ap.base_price)}
                                </span>
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Flag className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No more players in queue</p>
                            {(status === 'live' || status === 'paused' || status === 'ready') && (
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
                                      This will mark the auction as completed.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-slate-700 text-slate-300">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleAction('complete', () =>
                                          transitionAuctionStatus(
                                            initialAuction.id,
                                            'completed',
                                            stateVersion
                                          )
                                        , 'Auction completed')
                                      }
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      Complete Auction
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        )}
                      </div>
                    )}

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
                              Reverses the most recent sale, restores purse, and returns the player to the queue.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleAction(
                                  'undo',
                                  () =>
                                    undoLastSale(
                                      initialAuction.id,
                                      initialLastPurchase.id,
                                      stateVersion
                                    ),
                                  'Sale undone'
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

        {/* Teams / Events / Sold */}
        <div className="lg:col-span-4 space-y-4 order-3">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Team Purses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {initialTeams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
                      >
                        {team.short_name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {team.name}
                          {team.captain_name ? ` · ${team.captain_name}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {team.roster_count}/{team.max_roster_size} players
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-green-400">{money(team.remaining_purse)}</p>
                      <p className="text-xs text-slate-500">of {money(team.initial_purse)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Sold ({soldPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {soldPlayers.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No sales yet</p>
                  ) : (
                    soldPlayers.map((ap) => (
                      <div key={ap.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-white truncate">{ap.player?.display_name}</span>
                        <span className="text-green-400 font-mono shrink-0">
                          {money(ap.final_sale_price ?? 0)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm uppercase tracking-wider">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {initialRecentEvents.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No events yet</p>
                  ) : (
                    initialRecentEvents.slice(0, 12).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-2 text-xs border-b border-slate-800/50 pb-2"
                      >
                        <span className="text-slate-600 shrink-0">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </span>
                        <span className="text-slate-400">{event.event_type.replace(/_/g, ' ')}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
