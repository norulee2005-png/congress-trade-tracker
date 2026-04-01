# Deployment Guide

## Quick Start

Congress Trade Tracker deploys to **Vercel** with PostgreSQL on **Neon**. This guide covers setup, environment configuration, and ongoing maintenance.

## Prerequisites

- GitHub account (for Vercel integration)
- Neon account (free tier: 3GB storage)
- Vercel account (free tier included)
- Stripe account (optional, for Phase 2+ payments)
- Resend account (free: 100 emails/day)

## Step 1: Neon PostgreSQL Setup

### Create Database

1. Go to [neon.tech](https://neon.tech)
2. Sign up (GitHub OAuth available)
3. Create new project:
   - Name: `congress-tracker`
   - Region: `us-east-1` (lower latency to Vercel)
4. Copy connection string: `postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require`

### Initialize Schema

```bash
# Set DATABASE_URL in .env.local
export DATABASE_URL="postgresql://..."

# Run migrations
npm run db:push

# Seed initial politician data (optional)
npm run seed
```

## Step 2: Vercel Deployment

### Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select GitHub repo `congress-trade-tracker`
4. Vercel auto-detects Next.js
5. **Important:** Do NOT set environment variables during import (will be exposed in logs)

### Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Value | Source |
|----------|-------|--------|
| `DATABASE_URL` | From Neon | Neon Dashboard |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` | Generate new |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` | Generate new |
| `STRIPE_SECRET_KEY` | From Stripe Dashboard | Stripe API Keys |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Webhooks | Stripe Dashboard |
| `STRIPE_PRO_PRICE_ID` | price_1... | Stripe Products |
| `RESEND_API_KEY` | From Resend Dashboard | Resend API |
| `FROM_EMAIL` | alerts@yourdomain.com | Your domain |
| `NEXT_PUBLIC_BASE_URL` | https://yourdomain.com | Your domain |
| `NEXT_PUBLIC_SITE_URL` | https://yourdomain.com | Your domain |

**Security Rules:**
- Never commit `.env` or `.env.local`
- Use Vercel Secrets Manager (not hardcoded)
- Rotate secrets quarterly
- Keep `CRON_SECRET` private (prevent unauthorized cron triggers)

### Deploy

```bash
# Push to main branch
git push origin main

# Vercel auto-deploys on push
# Check deployment: Dashboard → Deployments

# View logs: Vercel → Deployments → [latest] → Logs
```

### Verify Deployment

1. Visit `https://yourdomain.com` (or Vercel preview URL)
2. Check homepage loads (should show recent trades)
3. Test search functionality
4. Verify no 500 errors in Vercel logs

## Step 3: Cron Jobs Setup

### Vercel Cron Configuration

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-trades",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/send-alerts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Cron Schedules:**
- `sync-trades`: Every 6 hours (0, 6, 12, 18 UTC)
- `send-alerts`: Every 6 hours (same time as scraping)

### Test Cron Jobs

```bash
# Local test (simulate Vercel cron header)
curl -X POST http://localhost:3000/api/cron/sync-trades \
  -H "Authorization: Bearer $CRON_SECRET"

# Production test (after deployment)
curl -X POST https://yourdomain.com/api/cron/sync-trades \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "trades_scraped": 15,
  "errors": 0,
  "duration_ms": 2345
}
```

## Step 4: Optional Integrations

### Stripe Setup (Phase 2+)

1. [Create Stripe account](https://stripe.com)
2. Create product: "Congress Tracker Pro"
3. Create price: $X/month (recurring)
4. Copy `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `price_id`
5. Set in Vercel environment variables
6. Add webhook endpoint in Stripe Dashboard:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`

### Resend Email Setup

1. [Create Resend account](https://resend.com)
2. Verify sender domain (or use `onboarding@resend.dev` for testing)
3. Copy API key
4. Set `RESEND_API_KEY` and `FROM_EMAIL` in Vercel

### Custom Domain

1. In Vercel Dashboard → Settings → Domains
2. Add custom domain: `yourdomain.com`
3. Point DNS A record to Vercel IP
4. Wait for verification (usually instant)
5. Update `NEXT_PUBLIC_*_URL` env vars to use custom domain

## Monitoring & Maintenance

### Health Checks

```bash
# Check pipeline health
curl https://yourdomain.com/api/health/pipeline

# Response indicates:
# - Last scrape timestamp
# - Trades scraped in last run
# - DB connection status
# - Error count
```

### Database Backups

Neon provides automatic backups (7-day retention). To restore:
1. Neon Dashboard → Backups
2. Select snapshot → Restore
3. **WARNING:** Restoring overwrites current data

### Scaling Notes

**Current Limits (free tier):**
- Neon: 3GB storage (tracks ~500K trades)
- Vercel: 10s function timeout, 100GB bandwidth/month
- Resend: 100 emails/day free (50K/month paid)

**When to upgrade:**
- Storage > 2GB → Upgrade Neon ($0.17/GB/month)
- Scraping > 10s → Refactor queries or increase Vercel Pro plan
- Emails > 100/day → Upgrade Resend or batch digests

### Troubleshooting

**Cron jobs not running:**
- Check `vercel.json` syntax
- Verify `CRON_SECRET` is set in Vercel
- Check logs: Vercel Dashboard → Deployments → Cron

**Database connection timeout:**
- Verify `DATABASE_URL` in Vercel (check copy-paste)
- Neon free tier may have connection limits; upgrade if frequent
- Restart Neon compute: Neon Dashboard → Restart

**Email not sending:**
- Check `RESEND_API_KEY` is correct
- Verify `FROM_EMAIL` matches Resend verified domain
- Check spam folder (might be flagged)
- Use Resend Dashboard to inspect failed sends

**High latency on politician pages:**
- ISR revalidation might be aggressive; increase to 7200s
- Add more indexes to `trades` table
- Monitor query times in Vercel logs

## Local Development

### Setup .env.local

```bash
# .env.local (never commit)
DATABASE_URL=postgresql://user:password@localhost/congress
CRON_SECRET=dev-secret-not-used-locally
JWT_SECRET=dev-jwt-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional (not needed for basic dev)
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_test_...
```

### Run Locally

```bash
npm install
npm run db:push  # Sync schema to local DB
npm run seed     # Populate sample data
npm run dev      # Start dev server
```

Visit `http://localhost:3000`

### Database Studio

```bash
npm run db:studio
# Opens Drizzle Studio UI to browse/edit data
```

## Release Checklist

Before pushing to production:

- [ ] All tests pass locally (`npm run lint` + test suite)
- [ ] Schema migrations tested on Neon dev instance
- [ ] Cron endpoints tested with `CRON_SECRET`
- [ ] Email templates reviewed (magic links, alerts)
- [ ] Environment variables set in Vercel
- [ ] Database backups enabled
- [ ] DNS / custom domain configured
- [ ] Stripe webhooks configured (if payment feature active)
- [ ] Monitoring alerts set up
- [ ] Commit message follows conventional format
- [ ] Code review approved

---

**Last Updated:** 2026-03-31 | **Owner:** DevOps / Engineering Team
