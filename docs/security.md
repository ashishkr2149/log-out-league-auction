# Security Documentation

## Authentication

- All dashboard routes are protected by Supabase Auth middleware
- The middleware refreshes the auth token on every request
- Unauthenticated users are redirected to `/login`
- The overlay does NOT require authentication — it uses a separate credential mechanism

## Row Level Security (RLS)

Every table in the public schema has RLS enabled. Key policies:

| Table | Read | Write |
|-------|------|-------|
| `tournaments` | Tournament members | Creator / Admin members |
| `teams` | Tournament members | Admin members |
| `players` | Tournament members | Admin members |
| `auctions` | Tournament members | Admin (create), Operators (update) |
| `auction_bids` | Tournament members | Operators |
| `auction_purchases` | Tournament members | Operators (insert), Admins (update) |
| `auction_events` | Tournament members | Operators |
| `overlay_credentials` | Admins only | Admins only |
| `overlay_configs` | Tournament members | Admins only |

## Overlay Security

### Credential System

- Overlay credentials are high-entropy random tokens (32 bytes, base64url encoded)
- Only the **SHA-256 hash** is stored in the database
- The raw token is returned **once** when created — it cannot be recovered
- Credentials can be revoked (sets `is_active = false` and records `revoked_at`)
- Expired credentials are rejected automatically
- The overlay API endpoint validates the token server-side before returning any data

### What the Overlay Can See

The overlay only receives:
- Auction name and tournament name
- Current player public info (name, display name, role, jersey number, photo, base price)
- Current bid amount and leading team (name, colors, logo)
- Auction phase (standby, bidding, sold, unsold, paused, completed)

### What the Overlay Cannot See

- Admin controls
- Private player notes
- Operator identities
- Audit log details
- Team purse details
- Other tournaments' data
- Database credentials

## Secret Management

| Secret | Location | Browser Exposure |
|--------|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | ✅ Yes (by design) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | ✅ Yes (by design, read-only with RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | ❌ Never |

**Critical rules:**
1. Never put the service role key in a `NEXT_PUBLIC_` variable
2. Never import server-only modules in client components
3. The `.env.local` file is in `.gitignore` — never commit it
4. The `.env.example` file contains only placeholder values

## Concurrency Protection

- Every auction mutation includes a `state_version` parameter
- The server rejects mutations where the provided version doesn't match the current version
- This prevents stale clients from overwriting newer state
- Sales use the Supabase service client for atomic operations

## Input Validation

- All forms use Zod schemas for client-side validation
- Server actions re-validate with the same schemas
- Database constraints enforce data integrity as a final safety net
- Currency amounts are validated as positive integers
