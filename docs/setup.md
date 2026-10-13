# Setup Guide

## Prerequisites

- Node.js 18+ 
- npm
- A Supabase account (free tier works)
- A Vercel account (for deployment)

## Local Development Setup

### 1. Clone and Install

```bash
cd /path/to/Auction
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **API keys** from Settings → API
3. You need:
   - `Project URL` (e.g., `https://abc123.supabase.co`)
   - `anon/public key` (safe for browsers)
   - `service_role key` (server-only, keep secret)

### 3. Apply Database Migrations

In the Supabase Dashboard → SQL Editor, run the contents of:

```
supabase/migrations/00001_initial_schema.sql
```

This creates all tables, indexes, RLS policies, and helper functions.

### 4. Configure Storage Buckets

In the Supabase Dashboard → Storage:

1. Create bucket `player-photos` (public)
2. Create bucket `team-logos` (public)
3. Create bucket `tournament-assets` (public)

For each bucket, add these storage policies:
- **Public read**: Allow `SELECT` for all users
- **Authenticated upload**: Allow `INSERT` for authenticated users
- **Authenticated update**: Allow `UPDATE` for authenticated users

### 5. Enable Realtime

In Supabase Dashboard → Database → Replication:

Enable realtime for these tables:
- `auctions`
- `auction_players`
- `overlay_configs`

### 6. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 8. Create Your First Account

1. Go to `/login`
2. Click "Don't have an account? Sign up"
3. Enter your email and password
4. Confirm your email (check spam folder)
5. Sign in

### 9. Create a Tournament

1. From the Dashboard, click "New Tournament"
2. Fill in tournament details
3. You are automatically added as an admin

### 10. Add Teams

1. Navigate to your tournament → Teams
2. Click "Add Team" 
3. Set team name, short name, colors, and purse

### 11. Add Players

**Individually:**
1. Navigate to tournament → Players
2. Click "Add Player"
3. Fill in player details

**Via CSV Import:**
1. Click "Import CSV"
2. Download the template
3. Fill in your player data
4. Upload and review
5. Confirm import

### 12. Create an Auction

1. From the tournament detail page, use the "Create Auction" form
2. Set auction name, currency, and bid increment
3. All registered players are automatically added to the auction

### 13. Run the Auction

1. Navigate to the auction control page
2. Mark the auction as "Ready"
3. Click "Start Auction"
4. Select a player from the queue → they appear in the overlay as "Player Introduction"
5. Click "Start Bidding"
6. Select a team and click the bid button
7. When bidding ends, click "SOLD" or "UNSOLD"
8. Move to the next player

## Running Tests

```bash
# Unit tests
npm test

# Type checking
npm run type-check

# Lint
npm run lint
```

## Production Build

```bash
npm run build
npm start
```
