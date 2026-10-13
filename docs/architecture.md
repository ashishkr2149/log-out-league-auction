# Log Out League — Auction Platform

## Architecture Overview

### System Design

The Log Out League Auction Platform is a web-based auction management system with live broadcast overlay graphics for OBS Studio. It follows a **controller-overlay** architecture:

- **Controller** (Dashboard): Authenticated operators manage tournaments, players, teams, and run live auctions
- **Overlay** (OBS Browser Source): Read-only broadcast graphics that update in real-time from the same database

All state lives in **Supabase PostgreSQL** — there is no localStorage, in-memory, or localhost dependency.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript (strict) |
| UI | Tailwind CSS, shadcn/ui (Base Nova), Lucide icons |
| Forms | React Hook Form + Zod validation |
| Database | Supabase PostgreSQL with Row Level Security |
| Auth | Supabase Auth (email/password) |
| Real-time | Supabase Realtime (postgres_changes) |
| Storage | Supabase Storage (player photos, team logos) |
| Hosting | Vercel |

### Key Architectural Decisions

1. **All monetary values are integers** — stored as whole rupees (INR). No floating-point arithmetic for currency.
2. **Optimistic concurrency control** — every auction mutation carries a `state_version`. Stale requests are rejected.
3. **Immutable audit log** — all auction events are recorded in `auction_events`. Undo is a compensating action, not a delete.
4. **Overlay credentials** — high-entropy tokens hashed with SHA-256. The raw token is shown once at creation; only the hash is stored.
5. **Transactional sales** — selling a player updates the purchase, roster, player status, and auction state atomically via service-role client.

### Data Flow

```
Operator → Dashboard UI → Server Action → Supabase PostgreSQL
                                                    ↓
                                            Realtime broadcast
                                                    ↓
                                    Overlay (polls /api/overlay + listens for Realtime)
```

### Directory Structure

```
src/
  app/                      # Next.js App Router pages
    (auth)/login/           # Authentication
    (dashboard)/            # Admin dashboard (protected)
      dashboard/
        tournaments/        # Tournament CRUD
        auctions/           # Auction control, settings, results
    overlay/[overlayToken]/ # OBS Browser Source page
    api/                    # API routes (overlay state, health)
  components/
    ui/                     # shadcn/ui components
    auction/                # Auction control panel
    overlay/                # Broadcast overlay renderer
  lib/
    supabase/               # Client, server, middleware helpers
    auth/                   # Permission checks
    auction/                # State machine, validation, server actions
    overlay/                # Credential management, public state
    validation/             # Zod schemas
  types/                    # TypeScript type definitions
supabase/
  migrations/               # PostgreSQL migration files
tests/
  unit/                     # Vitest unit tests
  e2e/                      # Playwright E2E tests
docs/                       # Documentation
```
