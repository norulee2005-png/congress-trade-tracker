# Code Standards & Conventions

## File & Naming Conventions

- **TypeScript/JavaScript:** kebab-case files (e.g., `auth-session.ts`, `politician-queries.ts`)
- **React Components:** PascalCase files (e.g., `PoliticianCard.tsx`) — colocate in feature dirs
- **Utilities:** kebab-case (e.g., `format-trade.ts`, `scraper-utils.ts`)
- **Directories:** kebab-case for clarity (e.g., `src/lib/queries/`, `src/db/schema/`)

## Project Structure

```
congress-trade-tracker/
├── src/
│   ├── app/                      # Next.js App Router (routes + pages)
│   │   ├── api/                  # API routes (REST endpoints)
│   │   │   ├── alerts/           # Alert management
│   │   │   ├── auth/             # Auth endpoints (login, logout, verify)
│   │   │   ├── stripe/           # Payment webhooks
│   │   │   ├── cron/             # Vercel cron jobs (scraping, alerts)
│   │   │   └── health/           # Health checks
│   │   ├── (pages)/              # Public pages (layout-grouped)
│   │   │   ├── page.tsx          # Home page
│   │   │   ├── politicians/      # Politician profiles
│   │   │   ├── stocks/           # Stock detail pages
│   │   │   ├── rankings/         # Profit rankings
│   │   │   ├── blog/             # Blog posts
│   │   │   └── search/           # Search results
│   │   ├── layout.tsx            # Root layout
│   │   ├── error.tsx             # Error boundary
│   │   └── global-error.tsx      # Global error handler
│   │
│   ├── db/                       # Database & ORM
│   │   ├── schema/               # Drizzle schema definitions
│   │   │   ├── politicians.ts    # Politician table
│   │   │   ├── trades.ts         # Trade transactions
│   │   │   ├── stocks.ts         # Stock metadata
│   │   │   ├── users.ts          # User accounts
│   │   │   ├── alerts.ts         # Alert configs
│   │   │   ├── magic-links.ts    # Email login tokens
│   │   │   └── alert-deliveries.ts # Delivery logs
│   │   ├── db-client.ts          # Neon Postgres client
│   │   └── index.ts              # Schema exports
│   │
│   ├── lib/                      # Utilities & services
│   │   ├── queries/              # Database query builders
│   │   │   ├── politician-queries.ts
│   │   │   ├── ranking-queries.ts
│   │   │   ├── stock-queries.ts
│   │   │   ├── dashboard-queries.ts
│   │   │   └── search-queries.ts
│   │   ├── scrapers/             # Web scrapers
│   │   │   ├── house-scraper.ts
│   │   │   ├── senate-scraper.ts
│   │   │   └── scraper-utils.ts
│   │   ├── auth-session.ts       # JWT & session handling
│   │   ├── magic-link-service.ts # Email login flow
│   │   ├── alert-processor.ts    # Alert condition checking
│   │   ├── trade-pipeline.ts     # Data pipeline orchestrator
│   │   ├── format-trade.ts       # Trade formatting utilities
│   │   ├── site-url.ts           # URL generation
│   │   ├── structured-logger.ts  # Logging service
│   │   ├── stripe-client.ts      # Stripe integration
│   │   ├── resend-client.ts      # Email client
│   │   ├── blog-posts.ts         # Blog post loader (MDX)
│   │   └── seed-politicians.ts   # DB initialization
│   │
│   ├── components/               # React components (future: when added)
│   └── styles/                   # Global CSS
│
├── public/                       # Static assets
├── scripts/                      # CLI scripts
│   ├── seed.ts                   # Populate initial data
│   └── scrape-incremental.ts     # Manual scrape trigger
│
├── docs/                         # Project documentation
├── plans/                        # Development plans & reports
├── drizzle/                      # Drizzle migrations
└── package.json
```

## TypeScript & Code Quality

**Version:** TypeScript 5+

### Type Safety
- Use strict mode (`"strict": true` in tsconfig)
- Avoid `any`; use `unknown` with type guards
- Export type definitions: `export type Trade = typeof trades.$inferSelect`
- Function signatures must specify return types

### ESLint Rules
- Config: `eslint-config-next` (enforces Next.js best practices)
- Rules: no unused variables, no console.log in prod, no innerHTML
- Fix with: `npm run lint -- --fix`

### Code Organization
- One responsibility per file (single concern principle)
- Export only public APIs; private utils stay internal
- Group related functions in modules (e.g., all queries in `queries/`)

## React & Next.js Patterns

### Pages & Routing
- Use **App Router** (not Pages Router)
- Dynamic routes: `[slug]` directories, export `generateStaticParams` for SSG
- Layouts cascade; define `layout.tsx` at dir level
- Error boundaries: `error.tsx` + `global-error.tsx`

### Rendering Strategies
- **SSG (Static):** Politician/stock pages (revalidate 3600s via ISR)
- **SSR (Dynamic):** Search, rankings (uncached, per-request)
- **CSR (Client):** Alerts page, forms (use `'use client'` directive)

### Data Fetching
- Use `fetch()` directly; no GraphQL
- Memoize queries: `const data = await db.query(...)` in async Server Components
- Revalidation: `revalidatePath()` or `revalidateTag()` after mutations
- Error handling: Wrap in try/catch, use error boundaries

### Component Structure
- Server Components by default (`app/` files are async server comps)
- Client Components only for interactive features: `'use client'` at top
- Props: Keep minimal and serializable (no functions/classes)

## Database & ORM

**Framework:** Drizzle ORM with PostgreSQL

### Schema Design
- Use UUID primary keys (`.primaryKey().defaultRandom()`)
- Add indexes on frequently queried columns (`index()`, `uniqueIndex()`)
- Foreign keys reference with `.references()`
- Timestamps: `createdAt`, `updatedAt` (auto-managed)

### Queries
- Place all queries in `src/lib/queries/{entity}-queries.ts`
- Use Drizzle's `.select()`, `.where()`, `.orderBy()` chainable API
- Type safety: Export query result types (`.inferSelect`)
- No raw SQL unless performance-critical; use Drizzle builders

### Migrations
- Run: `npm run db:push` (auto-migrates schema)
- Schema changes: Edit `.ts` files, push updates
- Backups: Neon provides automatic snapshots

## API Routes

**Endpoint Pattern:** `src/app/api/{resource}/route.ts`

### Structure
```typescript
// ✓ Correct: Typed handlers
export async function GET(request: Request) {
  try {
    const result = await db.query(...);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  // Validate body
  // Execute mutation
  return Response.json(result, { status: 201 });
}
```

### Error Handling
- Always wrap in try/catch
- Return appropriate HTTP status codes (200, 201, 400, 404, 500)
- Log errors with structured logger
- Never expose sensitive error details to client

### Auth
- Verify JWT in request headers: `request.headers.get('authorization')`
- Use `auth-session.ts` utilities
- Protect endpoints: Check session before executing logic

## Testing

**Status:** Test suite planned for Phase 6+

When implemented:
- Unit tests: Jest (`*.test.ts`)
- Integration tests: Real DB (no mocks)
- E2E: Playwright (critical user flows)
- Coverage target: 80%+ lines

## Git & Commits

**Convention:** Conventional Commits

```
feat(auth): add magic link email login
fix(scraper): handle missing filing dates
refactor(queries): consolidate politician search
docs(readme): add deployment instructions
chore(deps): upgrade Next.js to 16.2
test(alerts): add alert processor unit tests
```

**Branches:**
- Main branch: `main` (always deployable)
- Feature branches: `feat/{description}` or `fix/{issue-number}`
- Push to main after review + CI passes

## Security & Validation

- **Input validation:** Sanitize all user input (search, alerts)
- **XSS prevention:** Sanitize HTML in blog posts (`sanitize-html` lib)
- **CSRF:** Built into Next.js (form actions)
- **Rate limiting:** 10 req/s per IP on public endpoints
- **Secrets:** Never commit `.env`; use Vercel Secrets Manager
- **Dependencies:** Run `npm audit` before releases

## Performance Guidelines

- **Images:** Use `<Image>` component (auto-optimization)
- **Caching:** Set proper cache headers (ISR 3600s for static pages)
- **Bundle:** Keep client-side JS minimal (server components first)
- **Queries:** Add indexes for common filters; avoid N+1
- **Monitoring:** Log slow queries (>100ms) and API responses (>1s)

---

**Last Updated:** 2026-03-31 | **Owner:** Engineering Team
