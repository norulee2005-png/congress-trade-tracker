# Codebase Concerns

**Analysis Date:** 2026-04-01

## Tech Debt

**Large monolithic pipeline file:**
- Issue: `src/lib/trade-pipeline.ts` (394 lines) contains entire ETL orchestration, bulk upsert logic, politician/stock resolution, and concurrent task management in single file
- Files: `src/lib/trade-pipeline.ts`
- Impact: Difficult to test individual steps, hard to refactor batch insertion logic, makes politician/stock resolution logic reusable only via import
- Fix approach: Extract into focused modules: `trade-upsert-manager.ts` (politician/stock resolution), `trade-batch-inserter.ts` (chunked insertion), `senate-pipeline.ts`, `house-pipeline.ts` (separate from main orchestration)

**Webhook URL stored in plaintext:**
- Issue: Discord webhook URLs stored as plain JSON text in `alerts.channelConfig` column with comment noting they're unencrypted
- Files: `src/lib/alert-processor.ts` (line 69), `src/db/schema/alerts.ts`
- Impact: If database is compromised, attacker gains access to user Discord webhook URLs and can impersonate trade alerts
- Fix approach: Encrypt channel configs at application layer using `crypto` before storing; decrypt on retrieval; use KMS for key rotation in production

**Incomplete house filing deduplication logic:**
- Issue: House filing dedup in `src/lib/trade-pipeline.ts` (lines 261-275) extracts base filing ID by splitting on `-`, but unique filing ID format is `house-{docId}-{ticker}-{date}-{type}`, making extraction fragile
- Files: `src/lib/trade-pipeline.ts` lines 271-273
- Impact: Can skip duplicate processing but also can miss refiling corrections from House; edge cases with unusual docIds containing hyphens could fail
- Fix approach: Store canonical House document ID separately, dedupe by docId before processing, handle refiled documents by version

**Type safety gaps in scraper normalization:**
- Issue: House/Senate scrapers cast parsed XML to `Record<string, string>` without validation; missing fields default to empty string; no schema validation before normalization
- Files: `src/lib/house-scraper.ts` line 52, `src/lib/senate-scraper.ts` line 51, `src/lib/senate-scraper.ts` line 100
- Impact: Malformed House/Senate API responses silently become trades with empty fields; hard to debug data quality issues
- Fix approach: Use Zod or io-ts to validate raw transaction shape before normalization; log validation errors for monitoring

**Magic link vulnerability - no rate limiting:**
- Issue: `src/lib/magic-link-service.ts` has no rate limiting on token generation or consumption; 15-minute expiry only
- Files: `src/lib/magic-link-service.ts`, `src/app/api/auth/send-magic-link/route.ts`, `src/app/api/auth/verify/route.ts`
- Impact: Attacker can brute force tokens or spam email endpoints; no per-IP or per-email throttling
- Fix approach: Add Redis-backed rate limiting (Vercel KV): max 3 requests per email per 5 minutes, max 5 verification attempts per token

**PDF parsing failure silent fallback:**
- Issue: `src/lib/house-pdf-scraper.ts` (lines 70-77) silently returns empty array when `pdftotext` not available (Vercel env) instead of logging structured error
- Files: `src/lib/house-pdf-scraper.ts`, `src/app/api/cron/sync-trades/route.ts`
- Impact: House trade sync silently succeeds with zero House trades processed; operator unaware of missing data
- Fix approach: Store pipeline metadata (e.g., last-hour House trades scraped = 0) in database to alert when collection capacity changes; surface in health checks

**No tests for scrapers or data pipeline:**
- Issue: No unit or integration tests exist for scraper logic, normalization, or pipeline orchestration
- Files: `src/lib/house-scraper.ts`, `src/lib/senate-scraper.ts`, `src/lib/trade-pipeline.ts`, `src/lib/alert-processor.ts`
- Impact: Scraper bug regressions undetected until trades mislabel or corrupt; scraper site changes break silently
- Fix approach: Add Jest tests mocking House/Senate APIs; snapshot test normalized output; add contract tests for Drizzle inserts

---

## Known Bugs

**House PDF layout parsing edge case:**
- Symptoms: Multi-line asset names with tabs/unusual spacing may fail ticker extraction
- Files: `src/lib/house-pdf-scraper.ts` lines 115-121 (lookAhead joining by space may miss alignment)
- Trigger: House filings with asset names spanning 3+ lines or containing special characters
- Workaround: Manual correction via admin endpoint if needed; currently none provided

**Amount extraction fallback uses last value:**
- Symptoms: When amount spans lines, `extractAmount()` selects the *last* dollar value from next line, not necessarily the correct end of range
- Files: `src/lib/house-pdf-scraper.ts` lines 29-36
- Trigger: House filings with tabular layouts where multiple dollar values appear on same line
- Workaround: Implement better layout parsing using position hints or OCR bounding boxes

**Alert dedup index insufficient:**
- Symptoms: If same trade processed twice for same alert in rapid succession, both deliveries may occur (race condition)
- Files: `src/lib/alert-processor.ts` lines 116-121
- Trigger: Cron triggered twice simultaneously or long-running pipeline with alert processing overlap
- Workaround: None; requires application-level lock or database unique constraint with created_at

---

## Security Considerations

**JWT secret handling:**
- Risk: `process.env.JWT_SECRET` throws if missing; server crashes hard, not graceful degradation
- Files: `src/lib/auth-session.ts` line 9-11
- Current mitigation: Environment setup checklist in deployment guide
- Recommendations: Use fallback secret in development, validate on server startup in graceful init check, log warning if using default

**Stripe webhook signature verification:**
- Risk: Webhook signature validation delegated to Stripe SDK; if SDK has bug or version mismatch, webhooks could be spoofed
- Files: `src/app/api/stripe/webhook/route.ts` line 23
- Current mitigation: Stripe maintains SDK; production webhook secret in env
- Recommendations: Monitor Stripe SDK security advisories; add idempotency check by subscription ID to DB before update

**Discord webhook validation:**
- Risk: Webhook URL validation only checks prefix, not validity; user can input any URL and payload is POSTed to attacker server
- Files: `src/lib/alert-processor.ts` line 137
- Current mitigation: Prefix check only
- Recommendations: Validate webhook ownership by requiring Discord authentication; support server-only webhooks, not user-provided URLs

**Magic link email link exposure:**
- Risk: Tokens embedded in plaintext email; if email server is compromised, tokens are leaked; also visible in email logs
- Files: `src/lib/magic-link-service.ts` line 52
- Current mitigation: 15-minute expiry, one-time use
- Recommendations: Use derivation tokens (send hash, verify with key); implement device binding via User-Agent + IP capture

---

## Performance Bottlenecks

**N+1 politician lookup on bulk insert:**
- Problem: Trade pipeline queries existing politicians by slug, inserts missing, then re-queries conflicts; could be combined
- Files: `src/lib/trade-pipeline.ts` lines 92-141
- Cause: Bulk INSERT RETURNING doesn't guarantee all inserts due to conflicts; conservative re-query to handle concurrent inserts
- Improvement path: Use UPSERT instead of INSERT + retry; or batch raw SQL: INSERT ... ON CONFLICT DO UPDATE

**Unindexed alert filtering:**
- Problem: Alert processor iterates ALL active alerts for EVERY recent trade (nested loop); no spatial indexing
- Files: `src/lib/alert-processor.ts` lines 97-111
- Cause: Alert queries only by userId and isActive, not by target type/id; in-memory filter forces full table scans
- Improvement path: Denormalize alert target to separate tables (politician_alerts, stock_alerts, large_trade_alerts) with proper indexes; partition by alert type

**Module-level price cache with eviction:**
- Problem: Stock price cache uses FIFO eviction at 500-item limit; high-frequency tickers evicted first, causing refetch
- Files: `src/lib/stock-price-fetcher.ts` lines 27-34
- Cause: Simple in-memory cache without frequency tracking
- Improvement path: Use LRU or frequency-aware eviction; back by Redis for shared cache across server instances

**Bulk CSV/JSON export not paginated:**
- Problem: No export endpoints; if added, would load all trades into memory for export
- Files: Missing (potential future feature)
- Cause: No pagination abstraction for large result sets
- Improvement path: Stream responses via ReadableStream; cursor-based pagination for API

---

## Fragile Areas

**House filing scraper dependent on specific HTML structure:**
- Files: `src/lib/house-scraper.ts` lines 32-46 (XML parsing assumes FinancialDisclosure or NewDataSet root)
- Why fragile: House API changes root element name or nests structure differently → breaks parsing
- Safe modification: Add test cases for both old/new XML schemas; use polymorphic XML parser; validate structure before parsing
- Test coverage: No tests for XML parsing; no contract tests for House API shape

**PDF layout text extraction regex patterns:**
- Files: `src/lib/house-pdf-scraper.ts` lines 15-21 (TX_LINE_RE, TICKER_RE, AMOUNT_RE)
- Why fragile: Regex assumes specific spacing, date format, ticker notation; House PDF format changes break patterns
- Safe modification: Add regex unit tests with real House filing samples; maintain regex pattern documentation with examples
- Test coverage: No unit tests for regex patterns; no PDF sample collection for regression testing

**Alert processor email/Discord conditional:**
- Files: `src/lib/alert-processor.ts` lines 124-139
- Why fragile: Two separate branches for email vs Discord; if new channel added, easy to forget error handling
- Safe modification: Use strategy pattern with Channel interface; refactor to switch over channel enum; add type exhaustiveness check
- Test coverage: No tests for email/Discord delivery; no error injection tests

**Stock price fetcher fallback chain:**
- Files: `src/lib/stock-price-fetcher.ts` lines 40-79
- Why fragile: FMP → Yahoo fallback; if both fail silently, trades have no price; no alert for data gaps
- Safe modification: Add monitoring for fallback invocation; log when both fail; implement fallback queue (e.g., store missed tickers for retry)
- Test coverage: No mocking tests for FMP or Yahoo API; no failure scenario tests

---

## Scaling Limits

**Database connection pooling not explicit:**
- Current capacity: Neon serverless default (100 connection limit)
- Limit: 6-hour cron jobs + user requests compete for pool; no connection queuing
- Scaling path: Configure explicit pool size (10-20 for serverless); use pg-boss or Bull queue for deferred jobs

**Memory usage in concurrent House scraping:**
- Current capacity: Concurrency limit of 8 (line 281); each task parses PDF + normalizes trades in-memory
- Limit: Large filing (100+ trades) × 8 concurrent = 800+ trade objects in memory; could exceed Vercel 512MB limit
- Scaling path: Stream PDF parsing; implement chunked upsert; use async iterators instead of collecting arrays

**Single Vercel function timeout (60 seconds):**
- Current capacity: Full pipeline targets 30-second average; timeout 60 seconds
- Limit: If pipeline exceeds 60s (high-volume scraping), cron halts mid-insert; trades partially synced
- Scaling path: Break pipeline into sequential cron jobs (Senate 6h → House 6h + 30min → Prices 6h + 60min); use queuing system

**No read replica for analytics queries:**
- Current capacity: All reads from primary Neon database
- Limit: Heavy ranking/search queries slow down trade inserts during cron runs
- Scaling path: Add read replica or cache layer (e.g., Redis for top politicians, stocks); denormalize aggregates

---

## Dependencies at Risk

**poppler-utils (pdftotext) optional in Vercel:**
- Risk: System binary not available in Vercel; House trade sync silently returns 0 trades
- Impact: House data missing unless self-hosted or uses fallback API
- Migration plan: (1) Implement House XML fallback if House provides (currently migrated to PDF); (2) Use PDF.js library (pure JS, no system deps); (3) pre-commit House trades to static data

**xml2js unmaintained signals:**
- Risk: xml2js has minimal recent activity; parsing bugs unfixed
- Impact: House/Senate XML parsing hangs or crashes on malformed input
- Migration plan: Migrate to `fast-xml-parser` (faster, maintained) or use streaming XML parser for large documents

**Jose JWT library semantic versioning:**
- Risk: Jose v6 changed API surface; future v7 may have breaking changes
- Impact: Dependency bump could break session auth if signature format changes
- Migration plan: Pin major version; test session round-trip on every bump; consider switching to `jsonwebtoken` (more stable)

**Stripe SDK version drift:**
- Risk: Webhook handler uses untyped event.data.object casts; SDK updates could change structure
- Impact: Webhook handling fails silently if Stripe schema changes
- Migration plan: Use discriminated union for event types; add type guards for event payloads

---

## Missing Critical Features

**No admin panel for data correction:**
- Problem: Malformed trades (bad tickers, wrong amounts) can't be manually fixed; must delete and re-scrape
- Blocks: Operational support for incorrect filings; user trust if bad data persists
- Recommendation: Build simple admin UI to edit/delete trades; add audit log for corrections

**No data export for users:**
- Problem: Users can't export their alerts or trade lists
- Blocks: User data portability; integration with external tools
- Recommendation: Add CSV/JSON export endpoints with pagination; rate limit to prevent abuse

**No bulk upload for test data:**
- Problem: No way to inject test trades for development without live scrape
- Blocks: Testing alert logic, search, rankings without waiting for cron
- Recommendation: Add dev-only `/api/dev/trades/bulk-insert` endpoint (gated by NODE_ENV)

---

## Test Coverage Gaps

**Untested scraper normalization:**
- What's not tested: `normalizeHouseTransactions()`, `normalizeSenateTransactions()` logic; edge cases like missing tickers, malformed dates
- Files: `src/lib/house-scraper.ts` lines 103-132, `src/lib/senate-scraper.ts` lines 122-146
- Risk: Bad data silently inserted; date parsing bugs undetected
- Priority: High (affects data quality)

**Untested auth session flow:**
- What's not tested: Magic link generation → email → token verification → session cookie round-trip; timeout edge cases
- Files: `src/lib/auth-session.ts`, `src/lib/magic-link-service.ts`, `src/app/api/auth/*`
- Risk: Login flow breaks undetected; token expiry off-by-one
- Priority: High (user-facing feature)

**Untested alert processing:**
- What's not tested: Alert matching (politician/stock/large_trade), dedup, email/Discord sending; failure scenarios
- Files: `src/lib/alert-processor.ts`
- Risk: Alerts silently fail to send; false positives; duplicate sends
- Priority: High (core monetization feature)

**Untested Stripe webhook handling:**
- What's not tested: All event types (checkout, subscription.updated, subscription.deleted); signature validation; idempotency
- Files: `src/app/api/stripe/webhook/route.ts`
- Risk: Subscription state desyncs with Stripe; duplicate charges
- Priority: High (payment-critical)

**Untested ranking/search queries:**
- What's not tested: Ranking queries, search filtering, pagination; edge cases (empty results, large offsets)
- Files: `src/lib/queries/*.ts`
- Risk: Incorrect rankings; search results incomplete; pagination offset bugs
- Priority: Medium (UI correctness)

---

*Concerns audit: 2026-04-01*
