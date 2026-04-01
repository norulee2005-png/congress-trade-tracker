# Data Integrity & Reliability Review

**Scope:** trade-pipeline.ts, scraper-utils.ts, senate-scraper.ts, house-scraper.ts, db/schema/*.ts, alert-processor.ts, cron routes  
**Branch:** main | **Date:** 2026-03-31

---

## Findings

---

[CRITICAL] `filingId` has no UNIQUE constraint — `onConflictDoNothing` is silently a no-op
- Evidence: `src/db/schema/trades.ts:29` defines only `index('trades_filing_id_idx').on(table.filingId)` — a plain index, not a unique constraint. `src/lib/trade-pipeline.ts:134` calls `.onConflictDoNothing()` which requires a unique/exclusion constraint to fire; without one the insert simply proceeds and creates duplicates on every cron run.
- Recommendation: Add `uniqueIndex('trades_filing_id_unique').on(table.filingId)` (or `.unique()`) to the schema, then generate and apply a migration. The `onConflictDoNothing` call will then work as intended. Also guard against the `null` filingId case (see below).

---

[CRITICAL] Politician slug collision across chambers — `politicians.slug` is globally unique but chamber is not part of the uniqueness key
- Evidence: `src/db/schema/politicians.ts:16` — `slug: varchar('slug', { length: 200 }).unique().notNull()`. `src/lib/trade-pipeline.ts:60` queries by `slug AND chamber`, meaning the lookup is chamber-aware, but the DB unique constraint is slug-only. A senator "John Smith" (`john-smith`) and a representative "John Smith" (`john-smith`) cannot both exist; the second insert silently drops via `onConflictDoNothing` (`trade-pipeline.ts:75`), returning no ID, and all trades for that politician are discarded (`trade-pipeline.ts:113`).
- Recommendation: Change the unique constraint to a composite unique on `(slug, chamber)`. Update `upsertPolitician` to conflict-target that composite key. Existing data may need a slug dedup pass (e.g. `john-smith-senate` / `john-smith-house`) if same-name cross-chamber politicians exist.

---

[CRITICAL] All House trades for a filing share one `filingId` — no per-transaction dedup
- Evidence: `src/lib/house-scraper.ts:111` — every `ParsedHouseTrade` returned by `parseHouseFilingXml` gets `filingId: filing.filingId` (the filing-level ID, not a transaction-level ID). A House filing can contain dozens of trades. After prefixing (`house-${t.filingId}`, `house-scraper.ts:152`), all transactions from the same filing get the same `filingId`, so only the first insert per filing survives once the uniqueness constraint above is added; the rest are silently dropped.
- Recommendation: Construct a per-transaction compound key, e.g. `house-${filing.filingId}-${index}` or a hash of `(filingId, ticker, transactionDate, tradeType)`. Modify `normalizeHouseTransactions` to accept an index or generate a stable hash.

---

[IMPORTANT] `filingId` can be `null` — multiple null rows bypass dedup
- Evidence: `src/lib/trade-pipeline.ts:35` defines `filingId: string | null`. `src/db/schema/trades.ts:20` — column has no `NOT NULL`. With a UNIQUE constraint on `filingId`, Postgres treats each NULL as distinct (standard SQL NULLs are not equal), so every null-filingId trade inserts successfully, accumulating unlimited duplicates.
- Recommendation: Either (a) filter out trades with null filingId before insert, or (b) use a partial unique index `WHERE filing_id IS NOT NULL` alongside a fallback dedup key for null cases, or (c) generate a synthetic filingId (hash of key fields) when the source provides none.

---

[IMPORTANT] `parseAmountRange` fails on "1000000+" pattern (over-range strings)
- Evidence: `src/lib/scraper-utils.ts:11` — `cleaned` strips `$`, `,`, and whitespace. The `rangeMatch` at line 14 expects `\d+-\d+`; "1000000+" becomes "1000000+" which fails both range and over patterns. The `overMatch` at line 21 uses the raw (uncleaned) string but requires the literal word "over"; "1000000+" has no such word. The single-value match at line 27 fails on "+". Result: `{ min: null, max: null }` — amount is silently lost.
- Common STOCK Act strings that fail: `"$1,000,001 +"`, `"Over $50,000,000"` (passes), `"$50,000,001+"` (fails — no space before `+`).
- Recommendation: Add a `+` suffix pattern before the single-value fallback: `const plusMatch = cleaned.match(/^(\d+)\+$/); if (plusMatch) return { min: parseInt(plusMatch[1], 10), max: null };`

---

[IMPORTANT] `disclosureDate` type mismatch — stored as `text` in normalized trade but schema expects `date`
- Evidence: `src/lib/trade-pipeline.ts:29` — `disclosureDate: string`. `src/lib/senate-scraper.ts:136` assigns `disclosureDate: t.notificationDate` which is a raw API string (e.g. `"03/31/2026"` or ISO). `src/lib/house-scraper.ts:119` has fallback `filing.filingYear + '-01-01'` (ISO) mixed with `t.notification_date` (unknown format). `src/db/schema/trades.ts:18` — `date('disclosure_date').notNull()`. Postgres will reject non-ISO date strings silently via coercion failure, or insert garbage dates.
- Recommendation: Normalize all dates to `YYYY-MM-DD` in the scrapers. Add a `parseDate` utility that handles both `MM/DD/YYYY` and ISO formats, returning null on parse failure rather than letting malformed values reach the DB.

---

[IMPORTANT] `alert-processor.ts` sends duplicate alerts — no dedup / sent-log table
- Evidence: `src/lib/alert-processor.ts:88` `processAlerts(since)` fetches all trades disclosed in the last 7 hours on every 6-hour cron. With the 1-hour overlap window, any trade disclosed in hour 6 will be processed twice (hours 1–7 window, then hours 7–14 window shifted by 6). No sent-alert tracking exists in the schema.
- Recommendation: Add an `alert_deliveries` table keyed on `(alertId, tradeId)` with a unique constraint. Check before sending; record on success. Alternatively store last-processed timestamp per alert and advance it atomically.

---

[IMPORTANT] `normalizeTradeType` defaults unknown types to `'exchange'` — silent data corruption
- Evidence: `src/lib/scraper-utils.ts:43` — any unrecognized string returns `'exchange'`. House filings use types like `"S (partial)"`, `"P (partial)"`, `"S"`, `"P"`. Partial sales silently become `'exchange'`.
- Recommendation: Map `"S"` / `"S (partial)"` → `sell`, `"P"` / `"P (partial)"` → `buy`. Log unknown type strings with `log.warn` so new values are visible.

---

[MODERATE] `upsertPolitician` and `upsertStock` are not atomic — TOCTOU race under concurrent runs
- Evidence: `src/lib/trade-pipeline.ts:57–63` — select-then-insert pattern. Two concurrent cron executions (e.g. manual trigger + scheduled) could both see no existing record and both attempt insert. The `onConflictDoNothing` absorbs the second insert but returns no ID (line 78: `inserted[0]?.id ?? null`), causing the trade to be silently dropped.
- Recommendation: Use `INSERT ... ON CONFLICT DO NOTHING RETURNING id` and, when `inserted` is empty, re-query for the existing row. This is the standard "insert or fetch" pattern. Alternatively add a DB-level unique constraint that Drizzle can target with `onConflictDoUpdate`.

---

[MODERATE] `fetchHouseFilingIndex` fetches the entire year's index on every 6-hour cron, then re-fetches every XML filing
- Evidence: `src/lib/trade-pipeline.ts:166–175` — all filings for the year are fetched and re-parsed every run. House index for 2024 contained 10,000+ entries. With 300ms sleep per XML (`house-scraper.ts:93`), a full year re-scan takes hours and will timeout on Vercel (max cron duration: 300s on Pro).
- Recommendation: Track last-processed filing date or filing ID in a DB table (or env-based watermark) and fetch only filings newer than the watermark.

---

[MODERATE] `parseSenateXmlFiling` (`senate-scraper.ts:83`) uses `String(t.FilingID ?? '')` as filingId — not the Elasticsearch `_id`
- Evidence: `senate-scraper.ts:101` — the XML fallback path uses an in-document `FilingID` field which may differ from the Elasticsearch `_id` used in the primary path (`senate-scraper.ts:53`: `filingId: String(hit._id ?? '')`). Cross-path dedup will fail if the same filing is encountered via both code paths.
- Recommendation: Normalize filing IDs to a single canonical form (prefer Elasticsearch `_id`). Document the discrepancy.

---

[MODERATE] `channelConfig` parsed without validation — JSON.parse on untrusted/null DB value
- Evidence: `src/lib/alert-processor.ts:122` — `const config = JSON.parse(alert.channelConfig) as { webhookUrl: string }`. `channelConfig` is `text` (nullable, `alerts.ts:11`). If null or invalid JSON, this throws and increments `errors++` but continues processing other alerts for the same trade — the error is swallowed. `webhookUrl` is not validated before use.
- Recommendation: Wrap in try/catch or use safe JSON parse; validate `webhookUrl` is a string before calling `sendDiscordWebhook`. Consider a Zod schema for `channelConfig`.

---

[MODERATE] `fetchRecentTrades` uses string comparison on `date` column — timezone-dependent results
- Evidence: `src/lib/alert-processor.ts:23` — `sinceDate = since.toISOString().split('T')[0]`. `since` is `new Date(Date.now() - 7 * 60 * 60 * 1000)` (UTC). `disclosureDate` is a Postgres `date` type (no timezone). If the DB session timezone differs from UTC, `gte(trades.disclosureDate, sinceDate)` may miss or double-include trades at the boundary.
- Recommendation: Ensure Postgres session timezone is UTC (set `timezone = 'UTC'` in DB config or connection string). Add a note in deployment guide.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| IMPORTANT | 5 |
| MODERATE | 5 |
| **Total** | **13** |

**Top priorities:**
1. Add `UNIQUE` constraint on `trades.filing_id` (without this, dedup is entirely broken)
2. Fix politician slug uniqueness to be `(slug, chamber)` composite
3. Fix House per-transaction filingId generation
4. Add alert delivery dedup table

---

## Unresolved Questions

1. Does the Senate eFTS `_id` field actually guarantee uniqueness across paginated results, or can the same transaction appear in multiple pages with different `_id` values during live index updates?
2. Is the `parseSenateXmlFiling` fallback path currently reachable in production, or is it dead code?
3. What is the Vercel cron timeout limit for this project (Free vs Pro plan)? The House full-year re-scan may already be hitting it silently.
4. Are there existing duplicate rows in the `trades` table from prior runs before a unique constraint is added? A dedup migration script may be needed.
