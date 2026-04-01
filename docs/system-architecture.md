# System Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ PUBLIC WEB (House.gov, Senate.gov)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ VERCEL CRON JOB (/cron/sync-trades, every 6 hours)         │
│ - Fetch House filings (last 7 days)                        │
│ - Fetch Senate filings (last 7 days)                       │
│ - Parse with Cheerio + extract structured data              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TRADE PIPELINE (src/lib/trade-pipeline.ts)                 │
│ - Deduplicate by filing ID (prevent re-ingestion)          │
│ - Parse amount ranges → min/max USD                         │
│ - Match tickers to existing stocks                          │
│ - Insert or update in database                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ POSTGRESQL (NEON)                                           │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ politicians (537 members)                              │ │
│ │ trades (~500 new/week)                                 │ │
│ │ stocks (~2K unique tickers)                            │ │
│ │ users (alerts subscribers)                             │ │
│ │ alerts (user-defined rules)                            │ │
│ │ alert-deliveries (Kafka-style log)                     │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ QUERY LAYER (src/lib/queries/)                             │
│ - politician-queries (by name, party, chamber, trades)     │
│ - stock-queries (by ticker, sector, congress activity)     │
│ - ranking-queries (profit estimates, by sector)            │
│ - dashboard-queries (trending, top traders)                │
│ - search-queries (full-text, cross-table)                  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ NEXT.JS APP ROUTER                                          │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ SSG PAGES (revalidate 3600s)                           │ │
│ │ - / (dashboard)                                         │ │
│ │ - /politicians/[slug]                                  │ │
│ │ - /stocks/[ticker]                                     │ │
│ │ - /blog/[slug]                                         │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ SSR PAGES (dynamic, per-request)                       │ │
│ │ - /rankings (live profit ranking)                      │ │
│ │ - /search (query-driven results)                       │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ CSR PAGES (React + interactive)                        │ │
│ │ - /alerts (alert management)                           │ │
│ │ - /login (magic link entry)                            │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                            │
│ - React 19 components                                       │
│ - Tailwind CSS styling                                      │
│ - Dark mode toggle                                          │
│ - Korean-first UI labels                                    │
└──────────────────────────────────────────────────────────────┘
```

## Subsystem Design

### 1. Data Ingestion (Scraper → Pipeline)

**Components:**
- `src/lib/house-scraper.ts` — Parse House.gov filing XML/HTML
- `src/lib/senate-scraper.ts` — Parse Senate.gov filing data
- `src/lib/scraper-utils.ts` — Shared parsing logic (date, amount extraction)
- `src/lib/trade-pipeline.ts` — Orchestrator

**Flow:**
1. Vercel cron triggers `/cron/sync-trades` every 6 hours
2. Scrapers fetch last 7 days of filings (avoid refetching)
3. Extract fields: politician bioguide ID, ticker, trade type, amount range, date
4. Pipeline deduplicates by filing ID (prevent duplicates)
5. Match ticker to stock record (or create if new)
6. Insert Trade record with all metadata
7. Log pipeline health (success count, error count, duration)

**Deduplication Strategy:**
- Unique constraint on `trades.filing_id` (prevents re-ingestion)
- On conflict: skip (if already ingested)
- Audit: All updates logged to structured logger

### 2. Authentication & Authorization

**Components:**
- `src/lib/auth-session.ts` — JWT token lifecycle
- `src/lib/magic-link-service.ts` — Email login
- `src/app/api/auth/*` — REST endpoints

**Flow (Magic Link):**
1. User enters email at `/login`
2. `POST /auth/send-magic-link` generates token, sends email (Resend)
3. User clicks email link → redirects to `/auth/verify?token={token}`
4. Token verified, JWT created, stored in HTTP-only cookie
5. User redirected to `/alerts` (protected page)
6. Protected pages check JWT in cookie; if missing/invalid, redirect to `/login`

**Token Details:**
- JWT signed with `JWT_SECRET` (OpenSSL-generated, 32 bytes)
- Expires: 30 days (refresh not implemented)
- Payload: `{ email, userId, iat, exp }`

### 3. Alert System

**Components:**
- `src/db/schema/alerts.ts` — Alert rule config
- `src/lib/alert-processor.ts` — Condition matching
- `src/app/api/alerts` — CRUD endpoints
- `src/app/api/cron/send-alerts` — Vercel cron job

**Alert Flow:**
1. User creates alert: "Notify me on NVDA trades by Republicans"
2. Alert rule stored: `{ userId, stockTicker: "NVDA", party: "Republican", frequency: "immediate" }`
3. Every 6 hours (after scraping), `/cron/send-alerts` runs:
   - Fetch all active alerts
   - For each alert, query new trades matching conditions
   - If matches found, create alert delivery (log)
   - Send email via Resend (currently only email; KakaoTalk planned Phase 2)
   - Mark delivery as sent
4. User sees delivered alerts in `/alerts` dashboard

**Frequency Modes:**
- Immediate: Email on each matching trade
- Daily digest: Batch trades, email once/day
- Weekly: Batch trades, email once/week

### 4. Database Schema & Indexing

**Core Tables:**

```sql
-- Politicians
politicians (id UUID, bioguideId VARCHAR, firstName, lastName, nameEn, nameKr, 
             party, chamber, state, district, slug UNIQUE, photoUrl, isActive)

-- Trades (fact table)
trades (id UUID, politicianId UUID→politicians, stockId UUID→stocks, 
        stockTicker VARCHAR, tradeType ENUM[buy/sell/exchange], 
        amountRange VARCHAR, amountMin NUMERIC, amountMax NUMERIC, 
        tradeDate DATE, disclosureDate DATE, filingId UNIQUE, ...)

-- Stocks (dimension)
stocks (id UUID, ticker UNIQUE, nameEn, nameKr, sector, industry, 
        currentPrice NUMERIC, priceUpdatedAt TIMESTAMP, ...)

-- Users & Alerts
users (id UUID, email UNIQUE, isActive, createdAt)
alerts (id UUID, userId UUID→users, stockTicker, party, frequency, createdAt)
alert_deliveries (id UUID, alertId UUID→alerts, sentAt, status)

-- Auth
magic_links (id UUID, email, token, expiresAt TIMESTAMP)
```

**Indexes:**
- `trades_politician_idx` — Filter by politician
- `trades_stock_ticker_idx` — Filter by ticker
- `trades_disclosure_date_idx` — Range queries (date filtering)
- `trades_filing_id_unique` — Deduplication
- `politicians_slug_chamber_unique` — URL routing

### 5. API Design

**REST Endpoints:**

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/politicians/{slug}` | None | Fetch politician data |
| GET | `/api/stocks/{ticker}` | None | Fetch stock data |
| GET | `/api/trades?filter=...` | None | List trades (public) |
| POST | `/api/alerts` | JWT | Create alert |
| GET | `/api/alerts` | JWT | List user's alerts |
| PUT | `/api/alerts/{id}` | JWT | Update alert |
| DELETE | `/api/alerts/{id}` | JWT | Delete alert |
| POST | `/api/auth/send-magic-link` | None | Request login link |
| POST | `/api/auth/verify` | None | Verify token, issue JWT |
| POST | `/api/auth/signout` | JWT | Clear session |
| POST | `/api/cron/sync-trades` | CRON_SECRET | Trigger scraping |
| POST | `/api/cron/send-alerts` | CRON_SECRET | Trigger alert sending |
| GET | `/api/health/pipeline` | None | Health check |

**Response Format:**
```json
{
  "success": true,
  "data": {...},
  "error": null
}
```

### 6. Rendering Strategy

**Static Generation (SSG + ISR):**
- Politician pages: Pre-render all 537 members at build time
- Stock pages: Render common tickers (~100), demand-generate others
- Revalidation: 3600s (1 hour) — trades update every 6 hours
- Fallback: `fallback: 'blocking'` for unknown routes

**Server-Side Rendering (SSR):**
- Rankings page: Calculated on request (aggregates, sorting)
- Search results: Query-dependent, cannot precompute
- No caching (fresh data on each visit)

**Client-Side Rendering (CSR):**
- Alerts dashboard: Interactive form, POST requests
- Login page: Form submission
- Initially served as HTML (SSR shell), then hydrate as SPA

### 7. Monitoring & Observability

**Health Checks:**
- Pipeline health endpoint: `/api/health/pipeline`
  - Returns: Last scrape time, trades scraped, errors, DB connection status
- Structured logging: `src/lib/structured-logger.ts`
  - JSON format: `{ timestamp, level, context, message, error }`
  - Streamed to console (production: Vercel Logs)

**Error Handling:**
- Scrapers: Retry on network error, log failures
- Pipeline: Continue on partial failure (some trades fail, others succeed)
- API: Return 500 with error context; log for debugging
- Frontend: Error boundaries (`error.tsx`), fallback UI

**Rate Limiting:**
- Public endpoints: 10 req/s per IP (middleware planned)
- Auth endpoints: 5 req/min per email (brute-force protection)
- Cron endpoints: Auth via `CRON_SECRET` header

---

**Last Updated:** 2026-03-31 | **Owner:** Engineering Team
