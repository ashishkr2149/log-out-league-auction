'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { OverlayPublicState, AuctionPhase } from '@/types/database';
import { formatCurrency, getRoleLabel } from '@/lib/auction/validation';

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
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationPhaseRef = useRef<AuctionPhase>(initialState.phase);
  const [showAnimation, setShowAnimation] = useState(false);

  // Fetch latest state from API
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/overlay?token=${overlayToken}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const newState: OverlayPublicState = await res.json();
        if (newState.state_version > state.state_version) {
          // Detect phase change for animation
          if (newState.phase !== animationPhaseRef.current) {
            if (newState.phase === 'sold' || newState.phase === 'unsold') {
              setShowAnimation(true);
              setTimeout(() => setShowAnimation(false), 2000);
            }
            animationPhaseRef.current = newState.phase;
          }
          setState(newState);
          lastUpdateRef.current = Date.now();
          setStale(false);
          setConnected(true);
        }
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    }
  }, [overlayToken, state.state_version]);

  // Poll for updates (fallback for when realtime is unreliable)
  useEffect(() => {
    refreshIntervalRef.current = setInterval(fetchState, 2000);
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
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Side Panel - positioned to fit ~240px right-side OBS space */}
      <div
        style={{
          position: 'absolute',
          right: '10px',
          bottom: '80px',
          width: '220px',
          background: 'rgba(10, 10, 30, 0.92)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
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
            padding: '10px 12px',
            background: 'linear-gradient(135deg, #e94560 0%, #c92a4a 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {state.tournament_logo && (
            <img
              src={state.tournament_logo}
              alt=""
              style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover' }}
            />
          )}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', letterSpacing: '0.3px' }}>
              {state.tournament_name || 'LOG OUT LEAGUE'}
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>
              {state.auction_name}
            </div>
          </div>
        </div>

        {/* Content based on phase */}
        {renderPhaseContent(state, showAnimation, prefersReducedMotion)}
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
    <div style={{ padding: '24px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
        PLAYER AUCTION
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
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
          height: '140px',
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
              width: '110px',
              height: '110px',
              borderRadius: '12px',
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          />
        ) : (
          <div
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: 'rgba(255,255,255,0.15)',
            }}
          >
            👤
          </div>
        )}
      </div>

      {/* Player info */}
      <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: 'white', marginBottom: '2px' }}>
          {player.display_name}
        </div>
        {player.jersey_number && (
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
            #{player.jersey_number}
          </span>
        )}
        <div style={{ marginTop: '6px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 600,
            }}
          >
            {getRoleLabel(player.role)}
          </span>
        </div>
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px', letterSpacing: '1px' }}>
            BASE PRICE
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#e94560' }}>
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
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
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
            <span style={{ fontSize: '18px', opacity: 0.3 }}>👤</span>
          )}
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>
            {player.display_name}
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
            {getRoleLabel(player.role)}
            {player.jersey_number && ` • #${player.jersey_number}`}
          </div>
        </div>
      </div>

      {/* Current bid - prominent */}
      <div
        style={{
          padding: '12px',
          background: 'rgba(0,200,100,0.06)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', marginBottom: '4px' }}>
          CURRENT BID
        </div>
        <div style={{ fontSize: '24px', fontWeight: 900, color: '#4ade80', lineHeight: 1.1 }}>
          {formatCurrency(state.current_bid ?? player.base_price, state.currency_code)}
        </div>
      </div>

      {/* Leading team */}
      {state.current_team && (
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', marginBottom: '6px' }}>
            LEADING BID
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
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
                <span style={{ fontSize: '10px', fontWeight: 800, color: state.current_team.secondary_color }}>
                  {state.current_team.short_name.slice(0, 2)}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>
              {state.current_team.name}
            </div>
          </div>
        </div>
      )}

      {/* Live indicator */}
      <div
        style={{
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            animation: 'pulse 1.5s infinite',
          }}
        />
        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', fontWeight: 700 }}>
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
          padding: '12px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', letterSpacing: '3px' }}>
          SOLD!
        </div>
      </div>

      {/* Player */}
      <div style={{ padding: '14px 12px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
          {state.current_player.display_name}
        </div>

        {/* Final price */}
        <div style={{ fontSize: '22px', fontWeight: 900, color: '#4ade80', marginBottom: '12px' }}>
          {formatCurrency(state.final_price ?? state.current_bid ?? 0, state.currency_code)}
        </div>

        {/* Winning team */}
        {state.current_team && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
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
                <span style={{ fontSize: '11px', fontWeight: 800, color: state.current_team.secondary_color }}>
                  {state.current_team.short_name.slice(0, 2)}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>
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
          padding: '12px',
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', letterSpacing: '3px' }}>
          UNSOLD
        </div>
      </div>

      <div style={{ padding: '20px 12px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
          {state.current_player.display_name}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
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
    <div style={{ padding: '24px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b', letterSpacing: '2px' }}>
        BREAK
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
        Auction paused — will resume shortly
      </div>
    </div>
  );
}

function CompletedContent({ state }: { state: OverlayPublicState }) {
  return (
    <div style={{ padding: '24px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: '15px', fontWeight: 800, color: '#4ade80', letterSpacing: '1.5px' }}>
        AUCTION COMPLETE
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
        {state.tournament_name}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
        Thank you for watching!
      </div>
    </div>
  );
}
