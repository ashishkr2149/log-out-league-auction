'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { OverlayPublicState, AuctionPhase } from '@/types/database';
import { formatCurrency, getRoleLabel } from '@/lib/auction/validation';
import { createClient } from '@/lib/supabase/client';
import {
  OVERLAY_STATE_EVENT,
  auctionOverlayChannelName,
} from '@/lib/overlay/channel';

interface OverlayRendererProps {
  initialState: OverlayPublicState;
  overlayToken: string;
  auctionId: string;
}

export function OverlayRenderer({ initialState, overlayToken, auctionId }: OverlayRendererProps) {
  const [state, setState] = useState<OverlayPublicState>(initialState);
  const [connected, setConnected] = useState(true);
  const [stale, setStale] = useState(false);
  const lastUpdateRef = useRef<number>(Date.now());
  const stateVersionRef = useRef(initialState.state_version);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationPhaseRef = useRef<AuctionPhase>(initialState.phase);
  const [showAnimation, setShowAnimation] = useState(false);

  const applyState = useCallback((newState: OverlayPublicState) => {
    if (newState.state_version < stateVersionRef.current) return;

    if (newState.phase !== animationPhaseRef.current) {
      if (newState.phase === 'sold' || newState.phase === 'unsold') {
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 2000);
      }
      animationPhaseRef.current = newState.phase;
    }

    stateVersionRef.current = newState.state_version;
    setState(newState);
    lastUpdateRef.current = Date.now();
    setStale(false);
    setConnected(true);
  }, []);

  // Fetch latest state from API (works for OBS without auth cookies)
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/overlay?token=${encodeURIComponent(overlayToken)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const newState: OverlayPublicState = await res.json();
        applyState(newState);
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    }
  }, [overlayToken, applyState]);

  // Realtime: broadcast from control panel + postgres changes (when permitted)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(auctionOverlayChannelName(auctionId), {
        config: { broadcast: { self: true } },
      })
      .on('broadcast', { event: OVERLAY_STATE_EVENT }, () => {
        void fetchState();
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`,
        },
        () => {
          void fetchState();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [auctionId, fetchState]);

  // Polling fallback (OBS / blocked realtime)
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      void fetchState();
    }, 1000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchState]);

  // Stale detection
  useEffect(() => {
    const staleTimer = setInterval(() => {
      const elapsed = Date.now() - lastUpdateRef.current;
      if (elapsed > 30000) {
        setStale(true);
      }
    }, 5000);
    return () => clearInterval(staleTimer);
  }, []);

  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      style={{
        width: '1920px',
        height: '1080px',
        position: 'relative',
        background: 'transparent',
        fontFamily: "'Outfit', 'Space Grotesk', 'Segoe UI', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Side Panel - fills ~257px right-side OBS space, flush to right edge */}
      <div
        style={{
          position: 'absolute',
          right: '0px',
          top: '0px',
          bottom: '0px',
          width: '257px',
          background: 'rgba(10, 10, 30, 0.92)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: prefersReducedMotion ? 'none' : 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: state.phase === 'standby' && !state.current_player ? 0.6 : 1,
        }}
      >
        {/* Connection warning */}
        {(!connected || stale) && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: stale ? '#ef4444' : '#f59e0b',
              zIndex: 10,
            }}
          />
        )}

        {/* Tournament branding header */}
        <div
          style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #e94560 0%, #c92a4a 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {state.tournament_logo && (
            <img
              src={state.tournament_logo}
              alt=""
              style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
            />
          )}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', letterSpacing: '0.3px' }}>
              {state.tournament_name || 'LOG OUT LEAGUE'}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
              {state.auction_name}
            </div>
          </div>
        </div>

        {/* Content based on phase — vertically centered in remaining space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {renderPhaseContent(state, showAnimation, prefersReducedMotion)}
        </div>
      </div>
    </div>
  );
}

function renderPhaseContent(
  state: OverlayPublicState,
  showAnimation: boolean,
  prefersReducedMotion: boolean
) {
  switch (state.phase) {
    case 'standby':
      return <StandbyContent state={state} />;
    case 'player_intro':
      return <PlayerIntroContent state={state} />;
    case 'bidding':
      return <BiddingContent state={state} />;
    case 'sold':
      return <SoldContent state={state} showAnimation={showAnimation && !prefersReducedMotion} />;
    case 'unsold':
      return <UnsoldContent state={state} showAnimation={showAnimation && !prefersReducedMotion} />;
    case 'paused':
      return <PausedContent state={state} />;
    case 'completed':
      return <CompletedContent state={state} />;
    default:
      return <StandbyContent state={state} />;
  }
}

function StandbyContent({ state }: { state: OverlayPublicState }) {
  return (
    <div style={{ padding: '30px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
        PLAYER AUCTION
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
        Waiting to begin...
      </div>
    </div>
  );
}

function PlayerIntroContent({ state }: { state: OverlayPublicState }) {
  if (!state.current_player) return <StandbyContent state={state} />;
  const player = state.current_player;

  return (
    <div style={{ padding: '0' }}>
      {/* Player photo */}
      <div
        style={{
          width: '100%',
          height: '180px',
          background: 'linear-gradient(180deg, rgba(20,20,40,0.3) 0%, rgba(10,10,30,1) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.name}
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '14px',
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          />
        ) : (
          <div
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.05)',
              border: '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              color: 'rgba(255,255,255,0.15)',
            }}
          >
            👤
          </div>
        )}
      </div>

      {/* Player info */}
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '17px', fontWeight: 800, color: 'white', marginBottom: '3px' }}>
          {player.display_name}
        </div>
        {player.jersey_number && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            #{player.jersey_number}
          </span>
        )}
        <div style={{ marginTop: '8px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.08)',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 600,
            }}
          >
            {getRoleLabel(player.role)}
          </span>
        </div>
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', letterSpacing: '1px' }}>
            BASE PRICE
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#e94560' }}>
            {formatCurrency(player.base_price, state.currency_code)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BiddingContent({ state }: { state: OverlayPublicState }) {
  if (!state.current_player) return <StandbyContent state={state} />;
  const player = state.current_player;

  return (
    <div style={{ padding: '0' }}>
      {/* Compact player section */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {player.photo_url ? (
            <img src={player.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '22px', opacity: 0.3 }}>👤</span>
          )}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
            {player.display_name}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
            {getRoleLabel(player.role)}
            {player.jersey_number && ` • #${player.jersey_number}`}
          </div>
        </div>
      </div>

      {/* Current bid - prominent */}
      <div
        style={{
          padding: '16px',
          background: 'rgba(0,200,100,0.06)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', marginBottom: '5px' }}>
          CURRENT BID
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#4ade80', lineHeight: 1.1 }}>
          {formatCurrency(state.current_bid ?? player.base_price, state.currency_code)}
        </div>
      </div>

      {/* Leading team */}
      {state.current_team && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', marginBottom: '8px' }}>
            LEADING BID
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: state.current_team.primary_color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {state.current_team.logo_url ? (
                <img src={state.current_team.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '12px', fontWeight: 800, color: state.current_team.secondary_color }}>
                  {state.current_team.short_name.slice(0, 2)}
                </span>
              )}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
              {state.current_team.name}
            </div>
          </div>
        </div>
      )}

      {/* Live indicator */}
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            animation: 'pulse 1.5s infinite',
          }}
        />
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', fontWeight: 700 }}>
          LIVE BIDDING
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function SoldContent({ state, showAnimation }: { state: OverlayPublicState; showAnimation: boolean }) {
  if (!state.current_player) return <StandbyContent state={state} />;

  return (
    <div
      style={{
        padding: '0',
        animation: showAnimation ? 'slideUp 0.5s ease-out' : 'none',
      }}
    >
      {/* SOLD banner */}
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '4px' }}>
          SOLD!
        </div>
      </div>

      {/* Player */}
      <div style={{ padding: '18px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>
          {state.current_player.display_name}
        </div>

        {/* Final price */}
        <div style={{ fontSize: '26px', fontWeight: 900, color: '#4ade80', marginBottom: '16px' }}>
          {formatCurrency(state.final_price ?? state.current_bid ?? 0, state.currency_code)}
        </div>

        {/* Winning team */}
        {state.current_team && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: state.current_team.primary_color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {state.current_team.logo_url ? (
                <img src={state.current_team.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 800, color: state.current_team.secondary_color }}>
                  {state.current_team.short_name.slice(0, 2)}
                </span>
              )}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
              {state.current_team.name}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function UnsoldContent({ state, showAnimation }: { state: OverlayPublicState; showAnimation: boolean }) {
  if (!state.current_player) return <StandbyContent state={state} />;

  return (
    <div
      style={{
        padding: '0',
        animation: showAnimation ? 'slideUp 0.5s ease-out' : 'none',
      }}
    >
      {/* UNSOLD banner */}
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '4px' }}>
          UNSOLD
        </div>
      </div>

      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
          {state.current_player.display_name}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          Base Price: {formatCurrency(state.current_player.base_price, state.currency_code)}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function PausedContent({ state }: { state: OverlayPublicState }) {
  return (
    <div style={{ padding: '30px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', letterSpacing: '3px' }}>
        BREAK
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
        Auction paused — will resume shortly
      </div>
    </div>
  );
}

function CompletedContent({ state }: { state: OverlayPublicState }) {
  return (
    <div style={{ padding: '30px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: 800, color: '#4ade80', letterSpacing: '2px' }}>
        AUCTION COMPLETE
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '10px' }}>
        {state.tournament_name}
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
        Thank you for watching!
      </div>
    </div>
  );
}
