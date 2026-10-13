# Deployment Guide

## Deploying to Vercel

### Prerequisites

- A Vercel account
- A Supabase project (already set up per `setup.md`)

### Step 1: Push to Git

Initialize git and push to a repository (GitHub, GitLab, or Bitbucket):

```bash
cd /path/to/Auction
git init
git add .
git commit -m "Initial commit: Log Out League Auction Platform"
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

In Vercel → Project Settings → Environment Variables, add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Production |

**Important:**
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — Vercel keeps it server-side
- `NEXT_PUBLIC_*` variables are exposed to the browser — only put public keys there
- After deployment, update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL

### Step 4: Deploy

Click "Deploy". Vercel will build and deploy automatically.

### Step 5: Verify

1. Open your Vercel URL
2. Sign in with your Supabase credentials
3. Check that tournaments, teams, and players load correctly
4. Test the overlay URL from a different device

## Supabase Free Tier Limits

As of 2024, the Supabase free tier includes:

| Resource | Limit |
|----------|-------|
| Database | 500 MB |
| Storage | 1 GB |
| Realtime connections | 200 concurrent |
| Auth users | 50,000 MAU |
| API requests | Unlimited (fair use) |
| Edge Functions | 500K invocations/month |

**For a small tournament auction:**
- Database usage will be minimal (typically <10 MB)
- Storage depends on player photos (keep under 1 MB each)
- Realtime connections: the overlay + control panel = 2 connections minimum
- These limits are sufficient for a single tournament

**Warning:** Free tier limits may change. Check [supabase.com/pricing](https://supabase.com/pricing) for current limits.

## Vercel Free Tier Limits

| Resource | Limit |
|----------|-------|
| Serverless Functions | 100 GB-hours/month |
| Bandwidth | 100 GB/month |
| Builds | 6,000 minutes/month |
| Deployments | Unlimited |

For a tournament auction, these limits are more than sufficient.

## Post-Deployment Checklist

- [ ] Sign in successfully on production
- [ ] Create a test tournament
- [ ] Add test teams and players
- [ ] Create a test auction
- [ ] Generate overlay credentials
- [ ] Test the overlay URL from a separate network
- [ ] Test OBS Browser Source with the overlay URL
- [ ] Verify real-time updates work across networks
- [ ] Revoke test overlay credentials
- [ ] Delete test data (or keep it for rehearsal)

## Custom Domain (Optional)

1. In Vercel → Project Settings → Domains
2. Add your custom domain
3. Update DNS records as directed
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain
5. Redeploy

## Updating

To deploy updates:

```bash
git add .
git commit -m "Your change description"
git push
```

Vercel auto-deploys on push to the main branch.
