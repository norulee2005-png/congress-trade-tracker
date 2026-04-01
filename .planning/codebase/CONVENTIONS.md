# Coding Conventions

**Analysis Date:** 2026-04-01

## Naming Patterns

**Files:**
- kebab-case for components, services, utilities: `alerts-manager.tsx`, `auth-session.ts`, `house-scraper.ts`, `trade-pipeline.ts`
- camelCase inside files (functions, variables, classes)
- Descriptive names preferred over abbreviations: `stock-price-fetcher.ts` instead of `spf.ts`

**Functions:**
- camelCase: `parseAmountRange()`, `normalizeTradeType()`, `createLogger()`, `fetchHouseFilingIndex()`
- Prefix verb + noun pattern: `fetch*`, `parse*`, `normalize*`, `update*`, `create*`
- Async functions return Promises explicitly typed
- Example from `scraper-utils.ts`:
```typescript
export function parseAmountRange(raw: string): { min: number | null; max: number | null }
export function normalizeTradeType(raw: string): 'buy' | 'sell' | 'exchange'
export async function runFullPipeline(): Promise<PipelineResult>
```

**Variables:**
- camelCase for local and module variables: `alertList`, `errorData`, `politicianIdMap`, `seenFilingIds`
- UPPERCASE_SNAKE_CASE for constants: `ALLOWED_TYPES`, `ALLOWED_CHANNELS`, `CONCURRENCY`, `CHUNK`
- Descriptive naming in data structures: `firstName`, `lastName`, `disclosureDate`, `stockTicker` instead of abbreviated forms
- Example from `trade-pipeline.ts`:
```typescript
const ALLOWED_TYPES = ['politician', 'stock', 'large_trade'] as const;
const validTrades = normalizedTrades.filter((t) => t.filingId && t.filingId.trim() !== '');
```

**Types:**
- PascalCase for type/interface names: `PipelineResult`, `NormalizedTrade`, `TradeFilters`, `TradeSearchResult`
- Suffix with `*Type`, `*Result`, `*Config` for clarity
- Use `Record<string, T>` for object maps with predictable keys
- Example from `structured-logger.ts`:
```typescript
type LogLevel = 'info' | 'warn' | 'error';
interface LogEntry { level: LogLevel; component: string; message: string; ... }
```

## Code Style

**Formatting:**
- ESLint configuration in `eslint.config.mjs` enforces Next.js and TypeScript rules
- Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- 2-space indentation (implicit from config)
- No Prettier config detected — ESLint rules apply for formatting

**Linting:**
- Strict TypeScript (`"strict": true` in tsconfig.json)
- ESLint with Next.js presets covers React rules, import sorting, and security
- Run with: `npm run lint`
- Core rules: React Hooks, import ordering, web vitals

## Import Organization

**Order:**
1. External packages: `import axios`, `import * as xml2js`, `import type { Metadata }`
2. Internal alias imports: `import { db } from '@/db/db-client'`
3. Local relative imports: `import { parseAmountRange } from './scraper-utils'`

**Path Aliases:**
- `@/*` maps to `./src/*` in tsconfig.json
- Use `@/` prefix for imports to avoid deep relative paths
- Examples:
  - `import { db } from '@/db/db-client'`
  - `import { Trade } from '@/db/schema'`
  - `import AlertsManager from '@/components/alerts-manager'`

**Example import pattern from `trade-pipeline.ts`:**
```typescript
import { eq, and, inArray, sql, gte } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { politicians, trades, stocks } from '@/db/schema';
import { nameToSlug } from './scraper-utils';
```

## Error Handling

**Patterns:**
- Try-catch blocks in API routes and async functions
- Log errors via structured logger before returning response
- Return appropriate HTTP status codes with error messages in JSON
- Example from `api/alerts/route.ts`:
```typescript
try {
  const created = await db.insert(alerts).values({...}).returning();
  return NextResponse.json(created[0], { status: 201 });
} catch (err) {
  console.error('[Alerts] POST error:', err);
  return NextResponse.json({ error: 'Message in Korean' }, { status: 500 });
}
```

**Validation:**
- Validate input against allowed constants before processing
- Example from `api/alerts/route.ts`:
```typescript
const ALLOWED_TYPES = ['politician', 'stock', 'large_trade'] as const;
if (!ALLOWED_TYPES.includes(alertType)) {
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
```

**Error propagation:**
- Async functions throw errors and let caller handle
- API routes catch and return NextResponse with status codes
- Pipeline functions return `PipelineResult` with error array
- Structured logger captures error name, message, and stack trace

## Logging

**Framework:** Custom structured logger in `lib/structured-logger.ts`

**Pattern:**
- JSON output to stdout/stderr for Vercel log ingestion
- Create logger instance per component: `const log = createLogger('component-name')`
- Four methods: `info()`, `warn()`, `error()` with optional data payload
- Example from `structured-logger.ts`:
```typescript
export function createLogger(component: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => emit('info', component, message, data),
    warn: (message: string, data?: Record<string, unknown>) => emit('warn', component, message, data),
    error: (message: string, error?: unknown, data?: Record<string, unknown>) => { ... },
  };
}
```

**Usage in pipeline:**
```typescript
const log = createLogger('trade-pipeline');
log.info('Full pipeline started', { fromDate: '2026-03-02', toDate: '2026-04-01' });
log.error('Senate pipeline failed', err);
```

## Comments

**When to Comment:**
- Complex algorithms or business logic (e.g., bulk insert patterns, race condition handling)
- Non-obvious data transformations (e.g., filing ID parsing)
- References to external systems or rate limits
- Code review checkpoints marked with prefix: `I10:`, `M10:`, `C5:` (see trade-pipeline.ts)

**Style:**
- Block comments (`/** */`) for function/module documentation
- Inline comments (`//`) for explanatory notes within functions
- Example from `trade-pipeline.ts`:
```typescript
/**
 * Bulk-insert normalized trades. Uses bulk SELECT → INSERT pattern to avoid 1500+
 * sequential round-trips. Single bulk INSERT at end with onConflictDoNothing.
 */
async function upsertTrades(normalizedTrades: NormalizedTrade[]): Promise<number> {
  // I10: filter out trades with null/empty filingId
  const validTrades = normalizedTrades.filter((t) => t.filingId && t.filingId.trim() !== '');
```

**JSDoc:**
- Not consistently used; focus on TypeScript types for inference
- Return types always explicit in function signatures

## Function Design

**Size:**
- Most functions 20-60 lines
- Large functions (100+ lines) are processing pipelines with clear sections (marked by comments)
- Example: `upsertTrades()` in trade-pipeline.ts is 167 lines with 3 clear sections (Step 1/2/3)

**Parameters:**
- Explicit parameters preferred over object destructuring for simple cases
- Object destructuring for multiple related params: `{ alertType, targetId, channel }`
- Optional parameters use `?` and provide defaults
- Example from `searches-queries.ts`:
```typescript
export async function searchTrades(filters: TradeFilters): Promise<TradeSearchResult[]> {
  const { q, party, chamber, limit = 50, offset = 0 } = filters;
```

**Return Values:**
- Always explicitly typed
- Use union types for status results: `Promise<{ success: boolean; errors: string[] }>`
- Nullable fields use `| null` instead of `undefined`
- Example from `trade-pipeline.ts`:
```typescript
export interface PipelineResult {
  success: boolean;
  senateInserted: number;
  houseInserted: number;
  errors: string[];
  durationMs: number;
  completedAt: string;
}
```

## Module Design

**Exports:**
- Named exports for functions and types: `export function`, `export interface`
- Default exports for React components: `export default function AlertsManager()`
- Barrel files (`index.ts`) aggregate schema exports:
```typescript
// src/db/schema/index.ts
export { politicians } from './politicians';
export { stocks } from './stocks';
export { trades } from './trades';
```

**Barrel Files:**
- `src/db/schema/index.ts` exports all table and type definitions
- Used by components to import multiple types with single import
- Example usage in components:
```typescript
import { alerts, users } from '@/db/schema';
import type { Alert } from '@/db/schema';
```

**Organization by layer:**
- `src/lib/` - business logic, scrapers, utilities
- `src/lib/queries/` - database query helpers
- `src/components/` - React components
- `src/db/schema/` - database schema and types
- `src/app/` - Next.js pages and API routes

---

*Convention analysis: 2026-04-01*
