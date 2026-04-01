# Architecture

**Analysis Date:** 2026-04-01

## Pattern Overview

**Overall:** Multi-layer Next.js full-stack application with data ingestion pipeline, real-time query layer, and public web interface. Follows separation of concerns: scrapers → pipeline → database → queries → rendering.

**Key Characteristics:**
- Event-driven data ingestion via Vercel cron (6-hour intervals)
- Stateless API routes with lazy database connection (singleton pattern)
- Incremental Static Regeneration (ISR) for public pages (30-60 min revalidate)
- Server-side rendering for dynamic pages (rankings, search)
- Client-side interactivity for authenticated features (alerts)
- Korean-first content and UI language

## Layers

**Data Ingestion Layer:**
- Purpose: Fetch and normalize congressional trading disclosures from public sources
- Location: `src/lib/house-scraper.ts`, `src/lib/senate-scraper.ts`, `src/lib/scraper-utils.ts`, `src/lib/house-pdf-scraper.ts`
- Contains: Web scrapers, XML/HTML parsers, data normalizers, utility functions
- Depends on: Cheerio (HTML parsing), xml2js (XML parsing), axios (HTTP client), pdf-parse (PDF extraction)
- Used by: Trade pipeline (`src/lib/trade-pipeline.ts`), cron job (`src/app/api/cron/sync-trades/route.ts`)

**Pipeline & Processing Layer:**
- Purpose: Orchestrate data validation, deduplication, and persistence; enrich data with stock prices and metadata
- Location: `src/lib/trade-pipeline.ts`, `src/lib/stock-price-fetcher.ts`, `src/lib/alert-processor.ts`
- Contains: Trade aggregation, politician matching, deduplication logic, stock price enrichment, alert rule evaluation
- Depends on: Database client, scrapers, logger
- Used by: Cron jobs (`src/app/api/cron/sync-trades/route.ts`, `src/app/api/cron/send-alerts/route.ts`)

**Database Layer:**
- Purpose: Persist and query all application data (politicians, trades, stocks, users, alerts)
- Location: `src/db/db-client.ts`, `src/db/schema/`, `src/lib/queries/`
- Contains: Drizzle ORM client (lazy singleton), Postgres schema definitions, parameterized query functions
- Depends on: Neon serverless Postgres, Drizzle ORM
- Used by: Everything (pages, API routes, pipeline)

**Query & Service Layer:**
- Purpose: Provide domain-specific queries and business logic services
- Location: `src/lib/queries/` (dashboard, politician, stock, ranking, search, return queries), `src/lib/magic-link-service.ts`, `src/lib/auth-session.ts`
- Contains: Parameterized SQL queries (type-safe via Drizzle), aggregation logic, authentication flows
- Depends on: Database client
- Used by: Pages (`src/app/*/page.tsx`), API routes (`src/app/api/**/route.ts`)

**API Route Layer:**
- Purpose: HTTP endpoints for data mutations, webhooks, authentication, and dynamic content generation
- Location: `src/app/api/`
- Contains: Auth endpoints (`auth/*`), alert CRUD (`alerts/*`), cron jobs (`cron/*`), OG image generation (`og/*`), Stripe webhooks (`stripe/*`), health checks (`health/*`)
- Depends on: Services, database, third-party SDKs (Resend, Stripe, Vercel OG)
- Used by: Frontend (`fetch()` calls), external services (cron scheduler, webhooks)

**Rendering Layer:**
- Purpose: Render pages for users via Next.js App Router
- Location: `src/app/`
- Contains: Page routes (`*/page.tsx`), layouts, error/loading boundaries
- Depends on: Query layer, components, styling
- Used by: Browser (HTTP requests)

**Component Layer:**
- Purpose: Reusable React UI components for pages
- Location: `src/components/`
- Contains: Form components (LoginForm, SearchFilterForm), interactive widgets (AlertsManager, NavLinks), utilities (ProGate, Skeleton), styling with Tailwind
- Depends on: React 19, Tailwind CSS, Kakao SDK (for KakaoTalk sharing)
- Used by: Pages, other components

## Data Flow

**Scrape & Ingest Flow:**

1. Vercel cron triggers `GET /api/cron/sync-trades` every 6 hours
2. `src/lib/trade-pipeline.ts::runFullPipeline()` orchestrates:
   - `fetchSenateTransactions()` → scrapes Senate.gov eFTS data via Cheerio
   - `fetchHouseFilingIndex()` → fetches House.gov XML filing index
   - `parseHouseFilingXml()` + `parseHouseFilingPdf()` → parses XML/PDF to extract transactions
   - Normalizes all trades to uniform schema (NormalizedTrade)
3. Pipeline deduplicates by `filingId` (unique constraint prevents re-ingestion)
4. Matches politician names to database records (creates slug, finds existing record)
5. Matches stock tickers (creates Stock record if new)
6. Bulk upserts Trade records with `onConflictDoNothing` strategy
7. Updates stock prices via `updateStockPricesInDb()` (fetches live prices from external API)
8. Returns `PipelineResult` with counts and error log
9. Health check endpoint logs pipeline metrics

**Query & Display Flow:**

1. Page requests data via `src/lib/queries/*.ts` functions
2. Queries executed via Drizzle ORM on Neon Postgres (HTTP protocol, serverless)
3. Results typed via TypeScript inference from schema
4. Page renders Server Components with data
5. For ISR pages: result cached for 30-60 min revalidate
6. For SSR pages: fresh query per request
7. OG image generation routes (`src/app/api/og/*/route.tsx`) call queries and render images with @vercel/og

**Authentication Flow:**

1. User visits `/login`, enters email
2. `POST /api/auth/send-magic-link` → creates user (findOrCreateUser), generates token, sends email via Resend
3. User clicks email link → redirects to `/auth/verify?token={token}`
4. Verification extracts token, validates JWT signature, creates HTTP-only cookie with new JWT
5. Redirect to `/alerts` or dashboard
6. Protected pages check cookie JWT; missing/invalid = redirect to `/login`

**Alert Detection & Delivery Flow:**

1. User creates alert rule at `/alerts` → `POST /api/alerts` creates Alert record
2. Every 6 hours (after scraping), `/api/cron/send-alerts` runs:
   - Fetches all active alerts for all users
   - For each alert, evaluates conditions (stock ticker, party, chamber, trade type)
   - Queries new trades since last delivery
   - If matches found: creates AlertDelivery record (log), sends email via Resend
   - Updates delivery status (sent/failed)
3. User views deliveries in `/alerts` page (Server Component queries AlertDelivery records)

**State Management:**

- **Server State (Authoritative):** Database (Postgres) — politicians, trades, stocks, alerts, users
- **Cache State:** ISR revalidate timers (Next.js managed), OG image cache (CDN)
- **Session State:** HTTP-only JWT cookie (user authentication)
- **Client State (Ephemeral):** Form inputs, UI toggles (dark mode in localStorage), component state (React)
- **No global state management library** — all state either server-rendered or component-local

## Key Abstractions

**Trade:**
- Purpose: Represents a single congressional stock transaction
- Examples: `src/db/schema/trades.ts`, `src/lib/queries/dashboard-queries.ts::RecentTrade`
- Pattern: TypeScript type inference from Drizzle schema + query results. Trade entities include politician ID, stock ticker, type (buy/sell/exchange), amount range, disclosure date, filing URL.

**Politician:**
- Purpose: Congressional member with metadata (name, party, chamber, state, photos)
- Examples: `src/db/schema/politicians.ts`, `src/lib/queries/politician-queries.ts`
- Pattern: Slug-based routing (`/politicians/[slug]`). Schema includes both English and Korean names. Photo URL enriched from congressional sources.

**Alert:**
- Purpose: User-defined rule to notify on matching trades
- Examples: `src/db/schema/alerts.ts`, `src/lib/alert-processor.ts`
- Pattern: Stored as JSON-like conditions (stockTicker, party, chamber, frequency). Evaluated against new trades. AlertDelivery records log each notification sent.

**Query Function:**
- Purpose: Type-safe database query with business logic
- Examples: `src/lib/queries/dashboard-queries.ts::getRecentTrades()`, `src/lib/queries/ranking-queries.ts::getTopTradersProfit()`
- Pattern: Async functions returning typed results. Parameterized Drizzle queries prevent SQL injection. Complex logic (profit calculations) computed in TypeScript post-query.

**Scraper:**
- Purpose: Parse source data (House.gov, Senate.gov) into normalized transactions
- Examples: `src/lib/house-scraper.ts::fetchHouseFilingIndex()`, `src/lib/senate-scraper.ts::fetchSenateTransactions()`
- Pattern: Returns normalized array of transactions. Handles XML/HTML/PDF parsing variations. Includes retry/timeout logic.

## Entry Points

**Public Web (SSR + ISR):**
- Location: `src/app/page.tsx` (dashboard)
- Triggers: User navigates to `/`
- Responsibilities: Fetch recent trades, stats (7d/30d), top stocks, USD/KRW rate. Render dashboard with stat cards and trade list.

**Politician Detail Page (SSG):**
- Location: `src/app/politicians/[slug]/page.tsx`
- Triggers: User navigates to `/politicians/john-smith` (dynamic slug)
- Responsibilities: Fetch politician details, trades by this politician, calculate ROI. Render profile with trade history.

**Stock Detail Page (SSG):**
- Location: `src/app/stocks/[ticker]/page.tsx`
- Triggers: User navigates to `/stocks/NVDA`
- Responsibilities: Fetch stock metadata, all congressional trades in this stock, sector analysis. Render stock overview with trading activity.

**Rankings Page (SSR):**
- Location: `src/app/rankings/page.tsx`
- Triggers: User navigates to `/rankings`
- Responsibilities: Calculate profit estimates for all politicians (complex query), sort by profit. Render live rankings table (not cached).

**Search Page (SSR):**
- Location: `src/app/search/page.tsx`
- Triggers: User submits search query at `/search?q=...`
- Responsibilities: Full-text search across politicians, stocks, trades. Apply filters (chamber, party, trade type). Render results.

**Alerts Dashboard (CSR + Protected):**
- Location: `src/app/alerts/page.tsx`
- Triggers: Authenticated user navigates to `/alerts`
- Responsibilities: Display user's alerts and alert deliveries. Allow create/edit/delete via AlertsManager component.

**Magic Link Verification (Auth):**
- Location: `src/app/api/auth/verify/route.ts`
- Triggers: User clicks email link with token
- Responsibilities: Validate JWT token, create session cookie, redirect to authenticated page.

**Cron: Sync Trades (Scheduled):**
- Location: `src/app/api/cron/sync-trades/route.ts`
- Triggers: Vercel cron every 6 hours
- Responsibilities: Run full pipeline (scrape, parse, deduplicate, insert trades).

**Cron: Send Alerts (Scheduled):**
- Location: `src/app/api/cron/send-alerts/route.ts`
- Triggers: Vercel cron every 6 hours (after scraping)
- Responsibilities: Evaluate all active alerts, send emails to matching users.

## Error Handling

**Strategy:** Graceful degradation with structured logging. Errors logged with context (layer, timestamp, trace), exposed to users only where necessary.

**Patterns:**

- **Scraper Errors:** Caught in pipeline, logged, continue with remaining data. Returns partial success result.
- **Database Errors:** Caught, logged, returned as 500 to client. For critical queries (dashboard), fallback to stale ISR cache.
- **API Route Errors:** Try-catch block, return 400/500 with user-friendly message (usually in Korean).
- **Authentication Errors:** Invalid/missing token redirects to `/login`. No error details exposed.

## Cross-Cutting Concerns

**Logging:** Centralized via `src/lib/structured-logger.ts::createLogger()`. Each module creates named logger (`'trade-pipeline'`, `'house-scraper'`). Logs include timestamp, level, message, and context object.

**Validation:** Input validation at API boundaries (email regex in send-magic-link, search query length). Schema validation via Drizzle (type inference catches invalid inserts at compile time).

**Authentication:** JWT-based via `src/lib/auth-session.ts`. Token verified via JOSE library. User lookup by email from database.

**Internationalization (i18n):** Korean-first UI. All user-facing strings in Korean (no i18n library — hardcoded). English used in metadata, data sources.

**Caching:** ISR on public pages (30-60 min revalidate). Module-level cache for USD/KRW rate (1-hour expiry). OG image cache via CDN headers.

**Rate Limiting:** In-memory cooldown map for magic link emails (60s per email). Prevents spam. Not persisted (lost on redeploy).

**Security:** Secrets in environment variables only (JWT_SECRET, DATABASE_URL, CRON_SECRET, Stripe API keys, Resend API key). CSP headers in layout. X-Frame-Options SAMEORIGIN. Referrer policy strict-origin-when-cross-origin.

---

*Architecture analysis: 2026-04-01*
