# Performance Analysis Report
**Reviewer:** reviewer-2 | **Date:** 2026-03-31 | **Branch:** main

---

## Scope
- Files reviewed: `src/lib/trade-pipeline.ts`, `src/lib/senate-scraper.ts`, `src/lib/house-scraper.ts`, `src/lib/queries/{dashboard,politician,stock,search,ranking}-queries.ts`, `src/app/page.tsx`, `src/app/rankings/page.tsx`, `src/app/politicians/[slug]/page.tsx`, `src/app/stocks/[ticker]/page.tsx`, `src/db/schema/trades.ts`, `src/db/schema/politicians.ts`, `src/db/schema/stocks.ts`, `package.json`, `next.config.ts`, `vercel.json`

---

## Findings

---

[CRITICAL] Trade pipeline upserts are fully sequential — O(N) round-trips to DB
- **Evidence:** `src/lib/trade-pipeline.ts:110` — `for (const t of normalizedTrades)` loop calls `upsertPolitician()` + `upsertStock()` + `db.insert()` sequentially per trade. Each upsert does a SELECT then potentially an INSERT (3 round-trips per trade). For a 30-day Senate scrape of ~500 trades, this is ~1500 DB round-trips on a Neon serverless connection that has cold-start latency.
- **Recommendation:** Batch-deduplicate politicians and stocks before inserting. Collect all unique (slug, chamber) combos and tickers upfront, bulk-SELECT existing ones, INSERT missing ones with `onConflictDoNothing`, then bulk-INSERT trades. Replace the inner loop with a single `db.insert(trades).values([...allTrades]).onConflictDoNothing()`. This reduces 1500 round-trips to ~5.

---

[CRITICAL] House pipeline fetches ALL filings serially per XML file — no concurrency, no dedup guard
- **Evidence:** `src/lib/trade-pipeline.ts:170-175` — `for (const filing of filings)` calls `parseHouseFilingXml(filing)` sequentially with a `sleep(300)` inside each XML fetch (`house-scraper.ts:93`). The annual FD index for 2025 has 600–1000 PTR filings. At 300ms sleep + HTTP round-trip (~200ms avg), processing 800 filings = ~4 minutes. Vercel cron functions on the free tier have a 10s limit on hobby or 60s on pro — this pipeline will time out.
- **Recommendation:** Process filings in bounded concurrent batches (e.g., `p-limit` with concurrency=5). The sleep is already polite; batching 5 concurrent requests still respects rate limits while cutting wall time by 5x. Also consider persisting a "last processed filingId" to skip already-seen filings.

---

[CRITICAL] `force-dynamic` + `revalidate` conflict on dashboard and rankings pages
- **Evidence:** `src/app/page.tsx:15-16` — `export const dynamic = 'force-dynamic'` and `export const revalidate = 1800` are set simultaneously. `rankings/page.tsx:37-38` has the same pattern. In Next.js, `force-dynamic` means the page is always server-rendered at request time (no caching). The `revalidate` value is ignored when `dynamic = 'force-dynamic'`. The dashboard hits 5 DB queries on every single request — no ISR benefit is realized.
- **Recommendation:** Remove `dynamic = 'force-dynamic'` and keep only `revalidate = 1800`. This enables ISR: the page renders once, is cached for 30 minutes, then background-revalidates. Alternatively, keep `force-dynamic` but add `unstable_cache` wrappers around the DB calls.

---

[IMPORTANT] `getMostTradedStocks` has no date filter — full table scan on every rankings page load
- **Evidence:** `src/lib/queries/ranking-queries.ts:72-85` — `getMostTradedStocks()` aggregates across ALL trades with no `WHERE` clause. As the trades table grows this becomes a progressively slower full table GROUP BY. Called on every `/rankings` page request.
- **Recommendation:** Add a `days` parameter (default 90 or 365) with a `gte(trades.disclosureDate, since)` filter, matching the pattern used by `getMostActiveTraders`. Alternatively, ensure rankings page has effective ISR caching (see above finding) so the query runs at most hourly.

---

[IMPORTANT] `getPartyBuySellRatio` aggregates all-time data with no date limit
- **Evidence:** `src/lib/queries/ranking-queries.ts:88-99` — No `WHERE` clause. Same full-table scan risk as above. Called in parallel on every rankings page load.
- **Recommendation:** Add a `days` parameter. Party ratios for all-time historical data are arguably less useful than 90-day or 1-year views.

---

[IMPORTANT] `getAllTradedTickers` does unbounded `selectDistinct` — blocks `generateStaticParams`
- **Evidence:** `src/lib/queries/stock-queries.ts:45-49` — Returns every distinct ticker ever traded with no LIMIT. At build time, `generateStaticParams` in `stocks/[ticker]/page.tsx:29` fetches all tickers. If the table has 2000+ distinct tickers, this returns a massive array and generates 2000+ static pages, blowing Vercel build time and memory on the free tier.
- **Recommendation:** Limit to tickers with a minimum trade count (e.g., `HAVING COUNT(*) >= 2`) or cap at 500 most-traded. Add a hard LIMIT.

---

[IMPORTANT] `getAllPoliticianSlugs` is unbounded — same `generateStaticParams` risk
- **Evidence:** `src/lib/queries/politician-queries.ts:45-47` — No LIMIT. Congress has 535 members; but with pipeline inserting partial records for any mentioned name, this could grow unboundedly.
- **Recommendation:** Filter to `WHERE is_active = true` and/or limit to politicians with at least one trade.

---

[IMPORTANT] `getKrwRate` is an external HTTP call with no fallback caching at the application level
- **Evidence:** `src/app/page.tsx:41-47` — `getKrwRate()` is called on every dashboard render inside `Promise.all`. The `next: { revalidate: 3600 }` fetch option works correctly for Next.js data cache, but this cache is **in-memory and per-instance**. On Vercel free tier with serverless functions (cold starts on every request), the Next.js fetch cache does NOT persist between invocations. Each cold-start dashboard request makes a live HTTP call to `open.er-api.com`.
- **Recommendation:** Cache the exchange rate in the DB (or a Vercel KV/Redis) with a TTL, or use `unstable_cache` with a filesystem-backed key. Alternatively, accept null silently (already handled) but document the cold-start behavior.

---

[IMPORTANT] No compound indexes covering common query patterns
- **Evidence:** `src/db/schema/trades.ts:24-30` — Indexes exist on `politician_id`, `stock_ticker`, `trade_date`, `disclosure_date`, `filing_id` individually. But several queries filter on multiple columns:
  - `getRecentTrades`: `WHERE disclosure_date >= X ORDER BY disclosure_date DESC` — single-column index works but a compound `(disclosure_date DESC)` with `INCLUDE (politician_id)` would enable index-only scans.
  - `getTopBoughtStocks`: `WHERE disclosure_date >= X AND trade_type = 'buy'` — no compound index on `(disclosure_date, trade_type)`.
  - `getMostActiveTraders`: `WHERE disclosure_date >= X GROUP BY politicians.*` — same gap.
  - `getTopBuyersByAmount`: `WHERE trade_type = 'buy' AND disclosure_date >= X` — same.
- **Recommendation:** Add compound indexes: `(disclosure_date, trade_type)` and `(politician_id, trade_type)`. Given Postgres statistics, the planner may already handle these efficiently at small data sizes, but will degrade without compound indexes at scale.

---

[IMPORTANT] axios + xml2js not declared as `serverExternalPackages` in next.config.ts
- **Evidence:** `next.config.ts:1-7` — Empty config. `axios` and `xml2js` are Node.js-specific modules used only in scrapers (server-side only). Without `serverExternalPackages: ['axios', 'xml2js']`, Next.js may attempt to bundle them for edge/browser contexts. While the scrapers are only called from API routes (not pages), any accidental import chain could pull them client-side.
- **Recommendation:** Add `serverExternalPackages: ['axios', 'xml2js', 'cheerio']` to `next.config.ts`. Also add `stripe` to prevent it being bundled unnecessarily.

---

[MODERATE] Dashboard runs `getTradeStats(7)` and `getTradeStats(30)` as separate queries
- **Evidence:** `src/app/page.tsx:41-47` — Two calls to `getTradeStats` with different day values, each issuing a separate DB query. These could be a single query with a `CASE WHEN` or two CTEs.
- **Recommendation:** Low-impact given these are simple GROUP BY queries. Acceptable as-is; worth batching if query time becomes a concern.

---

[MODERATE] House scraper loads entire XML filing into memory with xml2js
- **Evidence:** `src/lib/house-scraper.ts:98-101` — `parser.parseStringPromise()` builds a full in-memory DOM of each XML filing. House PTR XML files can be large (multiple years of trades). Processing hundreds of these serially in one Vercel function invocation risks hitting the 512MB memory limit on the free tier.
- **Recommendation:** Consider streaming XML parsing (e.g., `sax` parser) for large files, or add a size check before parsing.

---

[MODERATE] `getStockTradeTrend` uses `TO_CHAR(trade_date, 'YYYY-MM')` — cannot use index
- **Evidence:** `src/lib/queries/stock-queries.ts:79-87` — Grouping and ordering by a function expression prevents index use on `trade_date`. For popular tickers (AAPL, NVDA) with hundreds of trades, this is a full seq scan of matching rows.
- **Recommendation:** If trend query becomes slow, add a functional index: `CREATE INDEX ON trades (stock_ticker, date_trunc('month', trade_date))`.

---

[MODERATE] `searchTrades` uses `ilike` with leading wildcard — full seq scan
- **Evidence:** `src/lib/queries/search-queries.ts:53-63` — `ilike(politicians.nameEn, '%query%')` and `ilike(trades.stockName, '%query%')` with leading `%` cannot use B-tree indexes. The `stocks` table is also LEFT JOINed for every search, even when `sector` filter is not applied.
- **Recommendation:** Add `pg_trgm` GIN index on `politicians.name_en`, `politicians.name_kr`, `trades.stock_ticker`, `trades.stock_name` for trigram-based ILIKE acceleration. Short-term: move LEFT JOIN on stocks to only execute when `sector` is present.

---

## Summary Table

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| IMPORTANT | 7 |
| MODERATE | 4 |
| **Total** | **14** |

---

## Top Recommended Actions (Priority Order)

1. Fix pipeline batching — replace serial upsert loop with bulk operations (CRITICAL, ~10x speedup for ingestion)
2. Fix `force-dynamic` + `revalidate` conflict on dashboard + rankings — enables ISR caching (CRITICAL, eliminates per-request DB cost)
3. Add Vercel function timeout guard or chunked processing for House pipeline (CRITICAL, prevents cron failures)
4. Add `serverExternalPackages` to next.config.ts for axios/xml2js/stripe (IMPORTANT, prevents accidental bundling)
5. Add compound DB indexes `(disclosure_date, trade_type)` and `(politician_id, trade_type)` (IMPORTANT)
6. Add LIMIT/filter to `getAllTradedTickers` and `getAllPoliticianSlugs` for static params generation (IMPORTANT)
7. Add date filter to `getMostTradedStocks` and `getPartyBuySellRatio` (IMPORTANT)

---

## Unresolved Questions

- What is the actual Vercel plan tier? (Free = 10s function limit, Pro = 60s) — critical for assessing cron timeout risk on house pipeline.
- Is the Next.js data cache (fetch cache) intentionally disabled? Serverless cold starts effectively bypass it without explicit cache storage configuration.
- Are there pagination plans for politician trade history (currently hardcoded LIMIT 100)? High-volume traders could eventually hit this cap.
