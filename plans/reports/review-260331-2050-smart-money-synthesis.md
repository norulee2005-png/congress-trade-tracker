# Code Review Synthesis — congress-trade-tracker

**Date:** 2026-03-31 | **Branch:** main | **Reviewers:** 3 (security, performance, data integrity)

---

## Executive Summary

35 unique findings across 3 parallel reviews. **8 critical issues** — the most urgent cluster around the trade dedup pipeline, which is fundamentally broken: no UNIQUE constraint on `filingId`, House trades sharing one filing-level ID, and politician slug collisions silently dropping trades. Combined with serial DB round-trips and Vercel timeout limits, the cron pipeline is both incorrect and slow.

| Severity | Security | Performance | Data Integrity | **Total** |
|----------|----------|-------------|----------------|-----------|
| CRITICAL | 2 | 3 | 3 | **8** |
| IMPORTANT | 3 | 7 | 5 | **15** |
| MODERATE | 3 | 4 | 5 | **12** |
| **Total** | **8** | **14** | **13** | **35** |

---

## Critical Findings (Fix Before Deploy)

### C1. Trade dedup is non-functional — `filingId` lacks UNIQUE constraint
- `trades.filing_id` is a plain index, not unique. `onConflictDoNothing()` is a no-op — every 6h cron inserts duplicates.
- **Fix:** Add `uniqueIndex` on `filing_id`. Run dedup migration on existing data.
- Sources: reviewer-3 (schema/trades.ts:29, trade-pipeline.ts:134)

### C2. House trades share one filingId — per-transaction dedup impossible
- All transactions from one House filing get the same `filingId`. Once C1's unique constraint is added, only 1 trade per filing survives.
- **Fix:** Construct compound key: `house-${filingId}-${index}` or hash of `(filingId, ticker, date, type)`.
- Sources: reviewer-3 (house-scraper.ts:111)

### C3. Politician slug collision across chambers
- `politicians.slug` is globally unique, but same-name senator+representative collide. Second insert drops silently, all their trades discarded.
- **Fix:** Composite unique on `(slug, chamber)`.
- Sources: reviewer-3 (politicians.ts:16, trade-pipeline.ts:60)

### C4. Trade pipeline is O(N) round-trips — 1500+ DB calls per cron run
- Sequential upsertPolitician + upsertStock + insert = 3 round-trips per trade. 500 trades = 1500 Neon serverless calls.
- **Fix:** Bulk-deduplicate upfront, batch INSERT with single `db.insert(trades).values([...]).onConflictDoNothing()`.
- Sources: reviewer-2 (trade-pipeline.ts:110)

### C5. House pipeline will timeout on Vercel — 800 serial XML fetches at 300ms each
- Annual FD index has 600-1000 PTR filings. ~4min wall time exceeds Vercel free (10s) and pro (60s) limits.
- **Fix:** Bounded concurrency (p-limit, concurrency=5) + skip already-seen filingIds.
- Sources: reviewer-2 (trade-pipeline.ts:170, house-scraper.ts:93)

### C6. `force-dynamic` + `revalidate` conflict — ISR disabled on dashboard & rankings
- `force-dynamic` suppresses `revalidate`. Every request hits DB cold (5 queries on dashboard).
- **Fix:** Remove `force-dynamic`, keep `revalidate = 1800`.
- Sources: reviewer-2 (page.tsx:15-16, rankings/page.tsx:37-38)

### C7. XSS via blog `remark-html` with `sanitize: false`
- Blog markdown rendered with `dangerouslySetInnerHTML`. Any `<script>` in .md executes in reader's browser.
- **Fix:** `remark().use(html, { sanitize: true })` or use `rehype-sanitize`.
- Sources: reviewer-1 (blog-posts.ts:58, blog/[slug]/page.tsx:121)

### C8. SSRF via unvalidated Discord webhook URL
- Pro users can supply arbitrary URLs (AWS metadata, internal hosts). Server does `fetch(webhookUrl)` without domain validation.
- **Fix:** Validate prefix: `https://discord.com/api/webhooks/`.
- Sources: reviewer-1 (alert-processor.ts:84, api/alerts/route.ts:42)

---

## Important Findings (Fix Soon)

| # | Finding | Source |
|---|---------|--------|
| I1 | No rate limiting on `/api/auth/send-magic-link` — Resend quota exhaustion | reviewer-1 |
| I2 | JWT 30-day sessions with no revocation mechanism | reviewer-1 |
| I3 | Magic link tokens accumulate indefinitely (no pruning) | reviewer-1 |
| I4 | Health endpoint exposes internal DB metrics without auth | reviewer-1 |
| I5 | `getMostTradedStocks` + `getPartyBuySellRatio` — unbounded full-table GROUP BY | reviewer-2 |
| I6 | `getAllTradedTickers` + `getAllPoliticianSlugs` unbounded — risk blowing build | reviewer-2 |
| I7 | `getKrwRate` fetch cache doesn't persist across Vercel cold starts | reviewer-2 |
| I8 | Missing compound indexes `(disclosure_date, trade_type)`, `(politician_id, trade_type)` | reviewer-2 |
| I9 | No `serverExternalPackages` in next.config.ts for axios/xml2js/stripe | reviewer-2 |
| I10 | Null `filingId` rows bypass UNIQUE constraint (Postgres NULL != NULL) | reviewer-3 |
| I11 | `parseAmountRange` fails on `"$1,000,001+"` pattern | reviewer-3 |
| I12 | `disclosureDate` format not normalized — mixed MM/DD/YYYY and ISO | reviewer-3 |
| I13 | Alert processor sends duplicate notifications — no sent-log table | reviewer-3 |
| I14 | `normalizeTradeType` maps "S (partial)" to `exchange` instead of `sell` | reviewer-3 |

---

## Moderate Findings (Track)

| # | Finding | Source |
|---|---------|--------|
| M1 | Weak email validation (`includes('@')` only) | reviewer-1 |
| M2 | No CSP/security headers | reviewer-1 |
| M3 | JSON-LD `dangerouslySetInnerHTML` with DB strings (low-prob XSS) | reviewer-1 |
| M4 | Discord webhook URLs stored in plaintext | reviewer-1 |
| M5 | Dashboard: `getTradeStats(7)` and `getTradeStats(30)` as separate queries | reviewer-2 |
| M6 | House XML loaded fully into memory — OOM risk at scale | reviewer-2 |
| M7 | `getStockTradeTrend` TO_CHAR prevents index use | reviewer-2 |
| M8 | `searchTrades` ILIKE with leading wildcard — full seq scan | reviewer-2 |
| M9 | TOCTOU race in `upsertPolitician`/`upsertStock` | reviewer-3 |
| M10 | House scraper re-fetches entire year index every cron run | reviewer-3 |
| M11 | Senate XML fallback uses different filingId format than primary path | reviewer-3 |
| M12 | `channelConfig` JSON.parse without null/validation guard | reviewer-3 |

---

## Positive Observations

- Stripe webhook signature validation is correct
- Magic link tokens use `crypto.randomBytes(48)` — cryptographically secure
- Session cookies: `httpOnly`, `secure` in prod, `sameSite: lax` — all correct
- Alert API routes enforce session + userId scoping (no IDOR)
- Drizzle ORM parameterizes all queries — no SQL injection vectors
- Cron endpoints protected by Bearer token (`CRON_SECRET`)
- Scrapers use polite User-Agent and rate limiting

---

## Recommended Fix Priority

**Phase 1 — Data Integrity (blocking correctness):**
1. Add UNIQUE on `trades.filing_id` + dedup migration (C1)
2. Fix House per-transaction filingId generation (C2)
3. Composite unique `(slug, chamber)` on politicians (C3)
4. Fix `normalizeTradeType` for House "S"/"P" codes (I14)
5. Normalize disclosureDate to YYYY-MM-DD (I12)

**Phase 2 — Performance (blocking scalability):**
6. Batch pipeline upserts (C4)
7. Bounded concurrency for House XML fetches + watermark (C5)
8. Fix `force-dynamic`/`revalidate` conflict (C6)
9. Add compound indexes (I8)
10. Add `serverExternalPackages` (I9)

**Phase 3 — Security (blocking production):**
11. Validate Discord webhook URL prefix (C8)
12. Enable blog HTML sanitization (C7)
13. Add rate limiting on magic link endpoint (I1)
14. Add CSP headers (M2)

**Phase 4 — Reliability:**
15. Add alert delivery dedup table (I13)
16. Handle null filingId (I10)
17. Fix `parseAmountRange` for "+" patterns (I11)
18. Prune expired magic link tokens (I3)

---

## Unresolved Questions

1. What Vercel plan tier? (Free=10s, Pro=60s function timeout) — affects C5 urgency
2. Are blog .md files exclusively dev-authored, or is external CMS planned? — affects C7 severity
3. Is `parseSenateXmlFiling` fallback path reachable in production? — affects M11
4. Do existing duplicate rows exist in `trades` table? — migration script needed before C1
5. Is there infrastructure-level bot protection (Cloudflare/Turnstile) on auth endpoints?

---

## Individual Reports

- [Security Audit](reviewer-1-260331-2051-security-audit.md) — 8 findings (2C, 3I, 3M)
- [Performance Analysis](reviewer-2-260331-2050-performance-analysis.md) — 14 findings (3C, 7I, 4M)
- [Data Integrity](reviewer-3-260331-2051-data-integrity.md) — 13 findings (3C, 5I, 5M)
