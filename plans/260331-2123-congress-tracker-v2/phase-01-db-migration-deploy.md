# Phase 1: DB Migration & Deploy

**Priority:** Critical | **Effort:** S | **Blocked by:** None

## Overview

Apply schema changes from fix commits to Neon Postgres, dedup existing data, push code.

## Steps

### 1.1 Dedup existing trades
- Connect to Neon via `psql` or Drizzle Studio
- Run dedup SQL: keep earliest row per `filing_id`, delete rest
```sql
DELETE FROM trades a USING trades b
WHERE a.id > b.id AND a.filing_id = b.filing_id AND a.filing_id IS NOT NULL;
```
- Count before/after: `SELECT COUNT(*) FROM trades;`

### 1.2 Apply schema migration
- Run `npm run db:push` — Drizzle push applies schema diff to Neon
- Verify: unique constraint on `trades.filing_id`, composite unique on `politicians(slug, chamber)`, new `alert_deliveries` table, compound indexes

### 1.3 Push commits
- `git push origin main`
- Verify Vercel auto-deploys

### 1.4 Smoke test
- Visit deployed site, confirm dashboard loads
- Trigger cron manually: `curl -H "Authorization: Bearer $CRON_SECRET" https://site/api/cron/sync-trades`
- Verify no duplicate insertions in logs

## Success Criteria
- [ ] Schema changes applied to Neon
- [ ] No duplicate trades in DB
- [ ] Site deployed and functional
- [ ] Cron runs without errors

## Risk
- Dedup SQL may delete legitimate rows if `filing_id` was incorrectly shared across trades (House bug from C2). Verify House trades have per-transaction IDs before dedup.
