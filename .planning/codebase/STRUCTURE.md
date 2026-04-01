# Codebase Structure

**Analysis Date:** 2026-04-01

## Directory Layout

```
congress-trade-tracker/
├── src/
│   ├── app/                        # Next.js App Router (v16)
│   │   ├── (root pages)
│   │   │   ├── page.tsx            # Dashboard (/)
│   │   │   ├── layout.tsx          # Root layout with theme, fonts, schemas
│   │   │   ├── globals.css         # Tailwind base styles
│   │   │   ├── error.tsx           # Error boundary
│   │   │   ├── global-error.tsx    # Global error boundary
│   │   │   ├── loading.tsx         # Root loading skeleton
│   │   │   ├── robots.ts           # SEO: robots.txt generator
│   │   │   └── sitemap.ts          # SEO: sitemap.xml generator
│   │   ├── api/                    # API routes
│   │   │   ├── auth/               # Authentication endpoints
│   │   │   │   ├── send-magic-link/route.ts   # POST: email magic link
│   │   │   │   ├── verify/route.ts            # GET: validate token, set cookie
│   │   │   │   └── signout/route.ts           # POST: clear session
│   │   │   ├── alerts/             # Alert CRUD
│   │   │   │   ├── route.ts        # GET/POST alerts
│   │   │   │   └── [id]/route.ts   # PUT/DELETE specific alert
│   │   │   ├── cron/               # Scheduled jobs
│   │   │   │   ├── sync-trades/route.ts      # GET: scrape & ingest trades (6h)
│   │   │   │   └── send-alerts/route.ts      # GET: process alerts & email (6h)
│   │   │   ├── health/             # Health checks
│   │   │   │   ├── scraper/route.ts          # GET: scraper status
│   │   │   │   └── pipeline/route.ts         # GET: pipeline status
│   │   │   ├── og/                 # Open Graph image generation
│   │   │   │   ├── top5/route.tsx            # OG: top 5 dashboard
│   │   │   │   ├── politician/[slug]/route.tsx   # OG: politician card
│   │   │   │   └── stock/[ticker]/route.tsx     # OG: stock card
│   │   │   ├── stripe/             # Stripe webhooks & checkout
│   │   │   │   ├── webhook/route.ts          # POST: Stripe events
│   │   │   │   ├── checkout/route.ts         # POST: create checkout session
│   │   │   │   └── portal/route.ts           # POST: billing portal redirect
│   │   ├── (public pages)
│   │   │   ├── blog/               # Blog articles
│   │   │   │   ├── page.tsx        # Blog listing
│   │   │   │   └── [slug]/page.tsx # Blog post detail
│   │   │   ├── politicians/        # Politician profiles
│   │   │   │   ├── page.tsx        # [Not created; listing via search]
│   │   │   │   └── [slug]/page.tsx # Politician detail + trades
│   │   │   ├── stocks/             # Stock pages
│   │   │   │   ├── page.tsx        # [Not created; listing via search]
│   │   │   │   └── [ticker]/page.tsx  # Stock detail + congressional trades
│   │   │   ├── rankings/           # Profit rankings (SSR)
│   │   │   │   └── page.tsx        # Live politician rankings by estimated profit
│   │   │   ├── search/             # Full-text search (SSR)
│   │   │   │   └── page.tsx        # Search results filtered by query/party/chamber
│   │   │   ├── top5/               # Top 5 traders (SSG)
│   │   │   │   └── page.tsx        # Top 5 by trade volume or profit
│   │   │   ├── methodology/        # Data methodology page
│   │   │   │   └── page.tsx        # STOCK Act explanation, data sources
│   │   ├── (authenticated)
│   │   │   ├── login/              # Auth entry point
│   │   │   │   └── page.tsx        # Magic link email form
│   │   │   ├── alerts/             # Alert management (protected)
│   │   │   │   └── page.tsx        # User alert rules & delivery history
│   │   │   ├── account/            # Account settings (protected)
│   │   │   │   └── page.tsx        # User profile, preferences
│   ├── components/                 # Reusable React components
│   │   ├── site-nav.tsx            # Header nav (links, auth state, theme toggle)
│   │   ├── nav-links.tsx           # Navigation link group (internal)
│   │   ├── login-form.tsx          # Email input for magic link flow
│   │   ├── alerts-manager.tsx      # Alert creation, edit, delete, delivery list
│   │   ├── search-filter-form.tsx  # Search + chamber/party/type filters
│   │   ├── account-actions.tsx     # Account menu (settings, logout)
│   │   ├── pro-gate.tsx            # Conditional render for pro users (stripe)
│   │   ├── sns-share-buttons.tsx   # Social share (KakaoTalk, Twitter, etc)
│   │   ├── theme-toggle.tsx        # Dark mode toggle
│   │   └── skeleton.tsx            # Loading skeleton component
│   ├── lib/                        # Business logic, queries, services
│   │   ├── queries/                # Parameterized database queries
│   │   │   ├── dashboard-queries.ts    # Recent trades, stats, top stocks, FX rate
│   │   │   ├── politician-queries.ts   # Politician by slug, trades, profile
│   │   │   ├── stock-queries.ts        # Stock by ticker, trades, sector info
│   │   │   ├── ranking-queries.ts      # Profit calculations, leaderboards
│   │   │   ├── search-queries.ts       # Full-text search, filters
│   │   │   └── return-queries.ts       # Return on investment calculations (complex)
│   │   ├── (scrapers)
│   │   │   ├── house-scraper.ts        # Fetch & parse House.gov filing index & XML
│   │   │   ├── house-pdf-scraper.ts    # Parse House PDF filings (legacy, slowdown)
│   │   │   ├── senate-scraper.ts       # Fetch & parse Senate.gov eFTS data
│   │   │   └── scraper-utils.ts        # Shared: parseAmountRange, normalizeDate, sleep, retry logic
│   │   ├── (pipeline & processing)
│   │   │   ├── trade-pipeline.ts       # Orchestrator: scrape, dedup, insert, upsert
│   │   │   ├── stock-price-fetcher.ts  # Fetch live stock prices, store in DB
│   │   │   ├── alert-processor.ts      # Evaluate alert conditions against new trades
│   │   │   └── seed-politicians.ts     # Bulk insert congressional member data (script)
│   │   ├── (auth & services)
│   │   │   ├── auth-session.ts         # JWT creation, validation, cookie management
│   │   │   ├── magic-link-service.ts   # User creation, token generation, email sending
│   │   │   ├── resend-client.ts        # Resend email API client initialization
│   │   │   └── stripe-client.ts        # Stripe SDK initialization
│   │   ├── (formatting & utils)
│   │   │   ├── format-trade.ts         # formatTradeType, formatAmount, formatDate, badge classes
│   │   │   ├── structured-logger.ts    # createLogger factory (module-level logging)
│   │   │   ├── site-url.ts             # SITE_URL constant, absoluteUrl() helper
│   │   │   └── blog-posts.ts           # Load, parse blog MDX files
│   ├── db/                         # Database & ORM
│   │   ├── db-client.ts            # Lazy singleton: getDb(), Drizzle connection
│   │   └── schema/                 # Drizzle ORM table definitions
│   │       ├── index.ts            # Re-export all tables
│   │       ├── politicians.ts      # Politicians table: bioguideId, names, party, chamber, slug, photo
│   │       ├── trades.ts           # Trades table: politician, stock, type, amount, dates, filing ID
│   │       ├── stocks.ts           # Stocks table: ticker, name, sector, price_at_disclosure
│   │       ├── users.ts            # Users table: email, stripe ID, pro status
│   │       ├── alerts.ts           # Alerts table: user, conditions (ticker, party, frequency)
│   │       ├── magic-links.ts      # Magic links table: token, user, expiry
│   │       └── alert-deliveries.ts # Alert delivery log: alert, delivery status, timestamp
│   ├── content/                    # Static content
│   │   └── blog/                   # Blog posts (MDX files)
│   │       └── [yyyy-mm-dd-slug]/  # Each post in dated subdirectory
│   │           └── index.mdx       # Post markdown + frontmatter
│   ├── data/                       # Data files
│   │   └── politician-names-kr.json    # Korean name mappings for politicians
│   ├── types/                      # TypeScript type definitions (if any shared types)
│   │   └── (inferred from schema; minimal custom types)
├── scripts/                        # CLI scripts
│   ├── scrape-incremental.ts       # Entry point: npm run scrape (calls trade-pipeline)
│   ├── seed.ts                     # Entry point: npm run seed (insert base politicians)
│   ├── enrich-politicians.ts       # Fetch politician photos & metadata from external sources
│   ├── enrich-politicians-legislators.ts  # Enrich with congress-legislators dataset
│   ├── enrich-stocks.ts            # Fetch stock sector & metadata
│   ├── backfill-photos.ts          # Backfill politician photos from ProPublica API
│   └── backfill-house-trades.ts    # Backfill missing House trades from archive
├── public/                         # Static assets
│   ├── favicon.ico
│   ├── robots.txt (via robots.ts)
│   └── sitemap.xml (via sitemap.ts)
├── drizzle/                        # Drizzle ORM migrations
│   └── (auto-generated by drizzle-kit)
├── docs/                           # Project documentation (not auto-generated)
│   ├── project-overview-pdr.md     # High-level project summary
│   ├── system-architecture.md      # Data flow, subsystems, design patterns
│   ├── code-standards.md           # Naming, style, conventions
│   ├── codebase-summary.md         # Directory & file overview
│   ├── deployment-guide.md         # Vercel setup, env vars, cron jobs
│   ├── development-roadmap.md      # Phases, milestones, status
│   └── project-changelog.md        # Release notes, feature history
├── .github/                        # GitHub config
│   └── workflows/                  # CI/CD (GitHub Actions)
├── .env.example                    # Required env var template
├── .env.local                      # (git ignored) Development env vars
├── .claude/                        # Claude Code config
├── .planning/                      # GSD planning & reports
│   └── codebase/                   # Architecture/structure docs (this directory)
├── next.config.ts                  # Next.js config
├── tsconfig.json                   # TypeScript config
├── drizzle.config.ts               # Drizzle ORM migration config
├── eslint.config.mjs               # ESLint config
├── package.json                    # Dependencies, scripts
├── postcss.config.mjs              # PostCSS + Tailwind config
└── README.md                       # Basic setup instructions
```

## Directory Purposes

**src/app:**
- Purpose: Next.js App Router pages, layouts, API routes
- Contains: Page routes (*.tsx), API routes (route.ts/route.tsx), error boundaries, metadata
- Key files: `layout.tsx` (root), `page.tsx` (dashboard), `api/*/route.ts` (endpoints)

**src/components:**
- Purpose: Reusable React components
- Contains: Presentational components, forms, interactive widgets
- Key files: `site-nav.tsx` (header), `alerts-manager.tsx` (complex state), `login-form.tsx` (auth entry)

**src/lib:**
- Purpose: Business logic, data access, utilities
- Contains: Query functions, scrapers, services, formatters, loggers
- Key files: `trade-pipeline.ts` (orchestrator), `queries/*` (type-safe queries), `house-scraper.ts`

**src/db:**
- Purpose: Database connection and schema
- Contains: Drizzle ORM client, Postgres table definitions
- Key files: `db-client.ts` (singleton), `schema/*.ts` (table definitions)

**src/content:**
- Purpose: Static content (blog posts, pages)
- Contains: MDX markdown files with frontmatter
- Key files: `blog/*/index.mdx` (blog post content)

**src/data:**
- Purpose: Data files used by application
- Contains: JSON mappings, reference data
- Key files: `politician-names-kr.json` (name translations)

**scripts:**
- Purpose: CLI utilities for data processing and database seeding
- Contains: Standalone TypeScript scripts run via `npm run` or cron
- Key files: `scrape-incremental.ts` (trigger pipeline), `seed.ts` (initial load)

**docs:**
- Purpose: Project documentation
- Contains: Architecture, guidelines, roadmap, deployment instructions
- Key files: `system-architecture.md` (data flow), `code-standards.md` (conventions)

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Public dashboard
- `src/app/api/cron/sync-trades/route.ts`: Scheduled trade scraping (Vercel cron)
- `src/app/api/auth/send-magic-link/route.ts`: Authentication entry point (email magic link)
- `src/app/alerts/page.tsx`: Authenticated alerts dashboard

**Configuration:**
- `next.config.ts`: Next.js runtime config (redirects, headers, image domains)
- `drizzle.config.ts`: Database migrations config
- `tsconfig.json`: TypeScript compiler options
- `package.json`: Dependencies, scripts (dev, build, seed, scrape)

**Core Logic:**
- `src/lib/trade-pipeline.ts`: Scrape → parse → deduplicate → insert trades
- `src/lib/queries/dashboard-queries.ts`: Dashboard data queries
- `src/db/schema/trades.ts`: Trade table schema (politician, stock, amount, dates)
- `src/lib/magic-link-service.ts`: Email authentication flow

**Testing:**
- No test files present (testing coverage not implemented)

## Naming Conventions

**Files:**
- Routes: `route.ts` or `route.tsx` (Next.js standard)
- Pages: `page.tsx` (Next.js standard)
- Components: PascalCase `ComponentName.tsx` (React convention)
- Services/libs: kebab-case `service-name.ts` (utility functions, e.g., `scraper-utils.ts`, `stock-price-fetcher.ts`)
- Schemas: singular lowercase `table-name.ts` (e.g., `trades.ts`, `politicians.ts`)

**Directories:**
- Feature routes: `[feature]/` lowercase (e.g., `politicians/`, `stocks/`, `api/`)
- Dynamic segments: `[param]` brackets (e.g., `[slug]`, `[ticker]`, `[id]`)
- Grouped routes: `(group-name)/` parentheses (e.g., `(public pages)`, `(authenticated)`) — logical grouping, not URL segment

**Functions:**
- Queries: camelCase, prefixed with action: `getRecentTrades()`, `getPoliticianBySlug()`, `getTopBoughtStocks()`
- Services: camelCase: `findOrCreateUser()`, `createMagicLinkToken()`, `sendMagicLinkEmail()`
- Utils: camelCase: `parseAmountRange()`, `normalizeDate()`, `formatTradeType()`

**Variables:**
- Constants: SCREAMING_SNAKE_CASE: `SITE_URL`, `DATABASE_URL`, `CRON_SECRET`
- Typed data: camelCase: `recentTrades`, `politicianSlug`, `stockTicker`

**Types:**
- Database inferred types: PascalCase: `Trade` (from schema), `NewTrade` (insert)
- Query return types: PascalCase: `RecentTrade`, `PoliticianDetail`, `TradeStatRow`

## Where to Add New Code

**New Feature (e.g., "Sector Analysis"):**
- Primary code: `src/lib/queries/sector-queries.ts` (new query file)
- API endpoint: `src/app/api/sectors/route.ts` (if API needed)
- Page: `src/app/sectors/page.tsx` (if public page)
- Schema: Extend `src/db/schema/stocks.ts` if new fields needed (e.g., sector normalization)
- Tests: Not currently used; would go in `__tests__` directory if added

**New Component (e.g., "SectorCard"):**
- Implementation: `src/components/sector-card.tsx` (PascalCase filename)
- Used by: Import in pages that need it

**New API Endpoint (e.g., "GET /api/sectors/[id]"):**
- Location: `src/app/api/sectors/[id]/route.ts`
- Pattern: Handle GET/POST/PUT/DELETE in same file
- Auth: Check JWT cookie if authenticated-only (see `src/app/api/alerts/[id]/route.ts` for pattern)

**New Page (e.g., "/sectors"):**
- Location: `src/app/sectors/page.tsx`
- Metadata: Include `export const metadata: Metadata = { ... }`
- ISR: Add `export const revalidate = 3600` if public & cacheable
- Queries: Use functions from `src/lib/queries/`
- Data fetching: Use `getDb()` or query functions (no fetch() for internal APIs)

**Utilities/Helpers:**
- Shared formatting: `src/lib/format-trade.ts` (or extend existing)
- Shared query logic: `src/lib/scraper-utils.ts` (or new `utilities-name.ts`)
- One utility per file if >50 lines

**Database Schema Changes:**
- Create new table: `src/db/schema/table-name.ts` (Drizzle syntax)
- Run: `npm run db:generate` (generates migration)
- Apply: `npm run db:push` (applies to Neon)
- Re-export: Add to `src/db/schema/index.ts`

**Scheduled Jobs (Cron):**
- Location: `src/app/api/cron/job-name/route.ts`
- Auth: Verify `CRON_SECRET` in Authorization header
- Response: Return `NextResponse.json({ ok: true, ... })` or `{ ok: false, errors: [...] }`
- Register: Add to `vercel.json` under `crons`

**Blog Posts:**
- Location: `src/content/blog/[yyyy-mm-dd-slug]/index.mdx`
- Frontmatter: Include title, date, excerpt, author
- Loaded by: `src/lib/blog-posts.ts` (read & parse MDX)

## Special Directories

**src/.next:**
- Purpose: Next.js build output (compiled pages, bundled JS, ISR cache)
- Generated: Yes (auto-built)
- Committed: No (.gitignore)

**drizzle/:**
- Purpose: Database migration SQL files
- Generated: Yes (via `npm run db:generate`)
- Committed: Yes (track schema evolution)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (npm install)
- Committed: No (.gitignore)

---

*Structure analysis: 2026-04-01*
