# Codebase Summary

**Generated:** 2026-03-31 | **Repository:** congress-trade-tracker | **Token Count:** 94,941

## Architecture Overview

Congress Trade Tracker is a full-stack Next.js application for tracking US Congress member stock trades. Data flows from web scrapers → PostgreSQL → REST API → React pages.

### Data Pipeline

```
House.gov / Senate.gov filings
    ↓
House/Senate Scrapers (Cheerio)
    ↓
Trade Pipeline (deduplicate, parse amounts)
    ↓
PostgreSQL (Neon)
    ↓
Database Queries
    ↓
API Routes & Server Components
    ↓
React Pages (SSG/SSR/ISR)
```

## Core Modules

### Database Schema (src/db/schema/)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **politicians** | US Congress members | id, bioguideId, nameEn, nameKr, party, chamber, slug, photoUrl |
| **trades** | Stock transactions | id, politicianId, stockId, stockTicker, tradeType, amountRange, tradeDate, disclosureDate |
| **stocks** | Stock metadata | id, ticker, nameEn, nameKr, sector, currentPrice, priceUpdatedAt |
| **users** | User accounts (alerts) | id, email, isActive, createdAt |
| **alerts** | Alert configurations | id, userId, conditions, frequency, deliveryChannels |
| **alert-deliveries** | Delivery logs | id, alertId, sentAt, status |
| **magic-links** | Email login tokens | id, email, token, expiresAt |

### API Routes (src/app/api/)

- `GET/POST /alerts` — Manage user alerts
- `GET /alerts/{id}` — Fetch alert details
- `POST /auth/send-magic-link` — Initiate email login
- `POST /auth/verify` — Verify JWT token
- `POST /auth/signout` — Clear session
- `POST /stripe/checkout` — Create checkout session
- `POST /stripe/portal` — Billing portal link
- `POST /stripe/webhook` — Payment webhook handler
- `POST /cron/sync-trades` — Trigger scraping (Vercel cron)
- `POST /cron/send-alerts` — Process alerts (Vercel cron)
- `GET /health/pipeline` — Health check

### Query Layer (src/lib/queries/)

- `politician-queries.ts` — Search, filters, rankings by trade volume
- `stock-queries.ts` — Stock details, price tracking, correlation with trades
- `ranking-queries.ts` — Profit rankings (buy→sell pairs), sector analysis
- `dashboard-queries.ts` — Home page stats, trending politicians
- `search-queries.ts` — Full-text search across politicians/stocks/trades

### Services (src/lib/)

| Service | Purpose |
|---------|---------|
| **auth-session.ts** | JWT token creation/validation, session management |
| **magic-link-service.ts** | Email magic link generation, token verification |
| **alert-processor.ts** | Check trade matches against user alert rules |
| **trade-pipeline.ts** | Orchestrate scrapers, deduplicate, pipeline health |
| **house-scraper.ts** | Parse House.gov filings (Cheerio + Axios) |
| **senate-scraper.ts** | Parse Senate.gov filings (Cheerio + Axios) |
| **stripe-client.ts** | Stripe API integration (checkout, webhooks) |
| **resend-client.ts** | Email service via Resend API |
| **structured-logger.ts** | JSON logging with context (pipeline monitoring) |
| **blog-posts.ts** | Markdown/MDX post loader |
| **format-trade.ts** | Display formatting (amounts, dates, types) |

### Pages (src/app/)

| Route | Rendering | Purpose |
|-------|-----------|---------|
| `/` | SSG (ISR 3600s) | Home dashboard (top trades, trending) |
| `/politicians/[slug]` | SSG (ISR 3600s) | Politician profile with trade history |
| `/stocks/[ticker]` | SSG (ISR 3600s) | Stock page with congress buyers/sellers |
| `/rankings` | SSR | Live profit rankings and sector analysis |
| `/search` | SSR | Full-text search results |
| `/blog/[slug]` | SSG (ISR 3600s) | Blog posts with rich metadata |
| `/alerts` | CSR | Alert management dashboard (protected) |
| `/login` | CSR | Email magic link entry |

### Key Features

**Phase 1–2 (Complete):**
- Trade scraping from House/Senate filings
- Politician profile pages
- Blog with Korean content
- Email authentication (magic links)
- Alert configuration UI

**Phase 3 (Planned):**
- Korean names for politicians
- Photo enrichment
- Sector/industry tagging

**Phase 4 (Planned):**
- Real-time stock prices (paid API)
- Profit ranking calculations
- Performance tracking

## Dependencies

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| **Framework** | next | 16.2.1 | App Router, SSG/ISR/SSR |
| **UI** | react, react-dom | 19.2.4 | Component library |
| **Styling** | tailwindcss | 4 | Utility-first CSS |
| **Database** | drizzle-orm, drizzle-kit | 0.45.2, 0.31.10 | ORM + migrations |
| **Postgres** | @neondatabase/serverless | 1.0.2 | Neon driver |
| **Scraping** | cheerio, axios | 1.2.0, 1.14.0 | HTML parsing, HTTP |
| **Auth** | jose | 6.2.2 | JWT signing/verification |
| **Email** | resend | 6.10.0 | Transactional email |
| **Payments** | stripe | 21.0.1 | Billing & webhooks |
| **Blog** | remark, remark-html | 15.0.1, 16.0.1 | Markdown processing |
| **OG Images** | @vercel/og | 0.11.1 | Dynamic OG metadata |
| **TypeScript** | typescript | 5 | Type safety |
| **Linting** | eslint, eslint-config-next | 9, 16.2.1 | Code quality |

## Environment Variables

| Var | Purpose | Required |
|-----|---------|----------|
| `DATABASE_URL` | Neon Postgres connection | Yes |
| `CRON_SECRET` | Vercel cron authorization | Yes |
| `JWT_SECRET` | Session token signing | Yes |
| `STRIPE_SECRET_KEY`, `STRIPE_*` | Payment processing | For Phase 2+ |
| `RESEND_API_KEY`, `FROM_EMAIL` | Email sending | Yes |
| `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL` | App URLs (OG, emails) | Yes |

## Performance & Monitoring

**Caching:**
- SSG pages: Revalidate every 3600s (1 hour)
- API responses: Cache-Control headers (no cache for dynamic endpoints)
- DB queries: Memoize in server components

**Logging:**
- Structured JSON logs (timestamp, level, context)
- Pipeline health endpoint: `/api/health/pipeline`
- Slow query tracking (>100ms logged)
- Error rate monitoring on cron jobs

**Limits:**
- Vercel: 10s function timeout, 100GB bandwidth
- Neon: 3GB storage (free tier)
- Resend: 100 emails/day (free tier)

## File Statistics

| Category | Files | LOC | % |
|----------|-------|-----|---|
| Pages | 25 | ~8,500 | 30% |
| Services | 12 | ~6,200 | 22% |
| Queries | 5 | ~2,800 | 10% |
| Schema | 7 | ~1,200 | 4% |
| API Routes | 10 | ~2,100 | 7% |
| Components & Styles | ~40 | ~3,500 | 12% |
| Docs & Config | 50+ | ~1,700 | 6% |
| **Total** | **113** | **~28,000** | **100%** |

## Testing Status

- **Unit tests:** Planned Phase 6+
- **Integration tests:** Not yet implemented
- **E2E tests:** Not yet implemented
- **Type coverage:** 100% (TypeScript strict)

## Deployment

- **Platform:** Vercel (Next.js native)
- **Database:** Neon Postgres (serverless)
- **CI/CD:** GitHub Actions (linting, tests on PR)
- **Cron jobs:** Vercel scheduled functions (sync-trades, send-alerts)

---

**Last Updated:** 2026-03-31 | **Owner:** Engineering Team
