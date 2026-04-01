# Testing Patterns

**Analysis Date:** 2026-04-01

## Test Framework

**Status:** No automated test framework configured

**Current State:**
- No Jest, Vitest, or Mocha dependencies in `package.json`
- No test files (*.test.ts, *.spec.ts) in source directories
- No testing libraries (@testing-library/react, @testing-library/dom)
- No test configuration files (jest.config.js, vitest.config.ts)

**Testing approach:**
- Manual testing via Next.js dev server (`npm run dev`)
- API route testing via curl, Postman, or manual browser interaction
- Pipeline functions tested via cron routes in staging/production
- Database changes validated via Drizzle Studio (`npm run db:studio`)

## Testing Strategy (Current)

**Manual Testing Points:**

**API Routes:**
- `src/app/api/alerts/route.ts` - Create/list alerts via POST/GET
- `src/app/api/cron/sync-trades/route.ts` - Manually trigger trade sync
- `src/app/api/stripe/webhook/route.ts` - Stripe webhook simulation
- Test via: curl, browser network inspector, or Stripe CLI webhook forwarding

**Pipeline Functions:**
- Located in `src/lib/trade-pipeline.ts`
- `runFullPipeline()` - Called by Vercel cron every 6 hours
- `runSenatePipeline()` - Tested by fetching live data from Senate eFTS
- `runHousePipeline()` - Tested by parsing real House XML filings
- Validate via: cron execution logs, database row counts, Vercel logs

**Database Mutations:**
- Schema in `src/db/schema/`
- Migrations via: `npm run db:push` (Drizzle Kit)
- Studio inspection via: `npm run db:studio` (interactive Drizzle Studio)
- Validate: row counts, unique constraint conflicts, foreign key integrity

**Component Testing:**
- Manual browser testing via `npm run dev`
- Test file: `src/components/alerts-manager.tsx`
- User interactions: form submission, error state display, dedup logic
- Validate: UI state changes, error messages in Korean, network requests

## Data Validation Patterns

**Input Validation (Pre-Processing):**

Validation in API routes before database operations:
```typescript
// src/app/api/alerts/route.ts
const ALLOWED_TYPES = ['politician', 'stock', 'large_trade'] as const;
const ALLOWED_CHANNELS = ['email', 'discord'] as const;

if (!ALLOWED_TYPES.includes(alertType)) {
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
if (!ALLOWED_CHANNELS.includes(channel)) {
  return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
}
if (channel === 'discord') {
  const url = channelConfig?.webhookUrl;
  if (typeof url !== 'string' || !url.startsWith('https://discord.com/api/webhooks/')) {
    return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
  }
}
```

**Data Transformation Helpers:**

Normalize inputs before storage:
```typescript
// src/lib/scraper-utils.ts
export function normalizeTradeType(raw: string): 'buy' | 'sell' | 'exchange' {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('purchase') || lower === 'buy' || ...) return 'buy';
  if (lower.includes('sale') || lower === 'sell' || ...) return 'sell';
  return 'exchange';
}

export function normalizeDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  const mmddyyyy = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, mm, dd, yyyy] = mmddyyyy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}
```

**Trade Amount Parsing:**

Complex logic for parsing STOCK Act amount ranges:
```typescript
// src/lib/scraper-utils.ts
export function parseAmountRange(raw: string): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null };
  const cleaned = raw.replace(/[$,\s]/g, '');
  const rangeMatch = cleaned.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }
  // Handle "Over", "+", single value patterns...
  return { min: null, max: null };
}
```

## Error Handling & Observability

**Structured Logging:**

Custom JSON logger outputs to stdout for Vercel log ingestion:
```typescript
// src/lib/structured-logger.ts
export function createLogger(component: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => emit('info', component, message, data),
    warn: (message: string, data?: Record<string, unknown>) => emit('warn', component, message, data),
    error: (message: string, error?: unknown, data?: Record<string, unknown>) => {
      const errorData: Record<string, unknown> = { ...data };
      if (error instanceof Error) {
        errorData.errorName = error.name;
        errorData.errorMessage = error.message;
        errorData.stack = error.stack;
      }
      emit('error', component, message, errorData);
    },
  };
}
```

**Pipeline Error Collection:**

All errors caught and collected in result object:
```typescript
// src/lib/trade-pipeline.ts
export interface PipelineResult {
  success: boolean;
  senateInserted: number;
  houseInserted: number;
  totalInserted: number;
  errors: string[];
  durationMs: number;
  completedAt: string;
}

export async function runFullPipeline(): Promise<PipelineResult> {
  const errors: string[] = [];
  let senateInserted = 0;
  let houseInserted = 0;

  try {
    senateInserted = await runSenatePipeline(fmt(thirtyDaysAgo), fmt(today));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Senate pipeline failed: ${msg}`);
    log.error('Senate pipeline failed', err);
  }

  // ... more error handling

  const result: PipelineResult = {
    success: errors.length === 0,
    senateInserted,
    houseInserted,
    totalInserted: senateInserted + houseInserted,
    errors,
    durationMs: Date.now() - startTime,
    completedAt: new Date().toISOString(),
  };

  log.info('Full pipeline completed', {
    success: result.success,
    senateInserted,
    houseInserted,
    totalInserted: result.totalInserted,
    durationMs: result.durationMs,
    errorCount: errors.length,
  });

  return result;
}
```

## Database Testing Approach

**Schema Validation:**

Drizzle ORM provides compile-time type checking for SQL queries. Schema definitions in `src/db/schema/` enforce constraints:

```typescript
// src/db/schema/trades.ts
export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  politicianId: uuid('politician_id').notNull().references(() => politicians.id),
  stockId: uuid('stock_id').references(() => stocks.id),
  disclosureDate: date('disclosure_date').notNull(),
  filingId: varchar('filing_id', { length: 100 }),
}, (table) => ({
  filingIdUnique: uniqueIndex('trades_filing_id_unique').on(table.filingId),
}));

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
```

**Bulk Insert Testing:**

Complex upsert logic in `src/lib/trade-pipeline.ts` includes:
- Deduplication by filing ID via unique index
- Constraint handling with `onConflictDoNothing()`
- Bulk processing in chunks of 500 to avoid query size limits
- Transaction consistency via atomic bulk operations

```typescript
// Chunked insert to handle large volumes
const CHUNK = 500;
let inserted = 0;
for (let i = 0; i < tradeRows.length; i += CHUNK) {
  const chunk = tradeRows.slice(i, i + CHUNK);
  try {
    const result = await db.insert(trades).values(chunk).onConflictDoNothing().returning({ id: trades.id });
    inserted += result.length;
  } catch (err) {
    log.error('Bulk trade insert failed', err, { chunkStart: i, chunkSize: chunk.length });
  }
}
```

## Component Testing Approach

**Manual Browser Testing:**

Components tested via interactive development:
```typescript
// src/components/alerts-manager.tsx - 'use client'
// Test scenarios:
// 1. Render initial alert list from props
// 2. Add new alert via form submission
// 3. Display error message on API failure
// 4. Dedup alerts by composite key (alertType|targetId|channel)
// 5. Show success confirmation after add
```

Key component interactions to verify:
- Form validation before POST
- Network error handling with user-friendly messages
- State updates reflect API response
- Duplicate prevention by composite key

```typescript
// Example from alerts-manager.tsx - dedup logic
setAlertList((prev) => {
  const key = `${data.alertType}|${data.targetId}|${data.channel}`;
  const exists = prev.some((a) => `${a.alertType}|${a.targetId}|${a.channel}` === key);
  return exists ? prev : [...prev, data];
});
```

## Recommended Test Setup (Future)

If automated tests are added, use:

**Framework:** Vitest + @testing-library/react
- Vitest for fast unit/integration tests
- @testing-library/react for component testing with user-centric patterns
- Example structure:

```typescript
// src/lib/scraper-utils.test.ts
import { describe, it, expect } from 'vitest';
import { parseAmountRange, normalizeTradeType, normalizeDate, nameToSlug } from './scraper-utils';

describe('parseAmountRange', () => {
  it('parses range pattern "$1,001 - $15,000"', () => {
    const result = parseAmountRange('$1,001 - $15,000');
    expect(result).toEqual({ min: 1001, max: 15000 });
  });

  it('parses over pattern', () => {
    const result = parseAmountRange('Over $1,000,000');
    expect(result.min).toBe(1000000);
    expect(result.max).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseAmountRange('')).toEqual({ min: null, max: null });
  });
});

describe('normalizeDate', () => {
  it('parses MM/DD/YYYY format', () => {
    expect(normalizeDate('03/15/2026')).toBe('2026-03-15');
  });

  it('returns YYYY-MM-DD unchanged', () => {
    expect(normalizeDate('2026-03-15')).toBe('2026-03-15');
  });

  it('returns null for empty/invalid', () => {
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate('invalid')).toBeNull();
  });
});

describe('nameToSlug', () => {
  it('converts names to URL-safe slugs', () => {
    expect(nameToSlug('Nancy Pelosi')).toBe('nancy-pelosi');
    expect(nameToSlug('Dan Crenshaw')).toBe('dan-crenshaw');
  });
});
```

**API Route Testing:**

```typescript
// src/app/api/alerts/alerts.test.ts (example structure)
import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from './route';

describe('/api/alerts', () => {
  it('POST rejects unauthenticated requests', async () => {
    // Mock NextRequest without session
    // Expect 401 status
  });

  it('POST validates alert type against ALLOWED_TYPES', async () => {
    // POST with alertType='invalid'
    // Expect 400 status with error message
  });

  it('POST requires Discord webhook URL format', async () => {
    // POST with channel='discord' and invalid webhookUrl
    // Expect 400 status
  });

  it('POST gates Discord alerts to Pro subscribers', async () => {
    // POST from free user with channel='discord'
    // Expect 403 status
  });

  it('GET returns all active alerts for user', async () => {
    // Setup mock user with alerts
    // Call GET
    // Expect array of alerts with matching userId
  });
});
```

**Pipeline Testing:**

```typescript
// src/lib/trade-pipeline.test.ts (example structure)
import { describe, it, expect, vi } from 'vitest';
import { upsertTrades, runSenatePipeline, runHousePipeline, runFullPipeline } from './trade-pipeline';

describe('upsertTrades', () => {
  it('filters out trades with null/empty filingId', async () => {
    const trades = [
      { ..., filingId: 'house-001-1' },
      { ..., filingId: null },
      { ..., filingId: '' },
    ];
    // Call upsertTrades
    // Expect only 1 inserted
  });

  it('deduplicates by composite key (firstName|lastName|chamber)', async () => {
    const trades = [
      { _firstName: 'Nancy', _lastName: 'Pelosi', _chamber: 'house', ... },
      { _firstName: 'Nancy', _lastName: 'Pelosi', _chamber: 'house', ... },
    ];
    // Call upsertTrades
    // Expect single politician record created
  });

  it('chunks inserts into batches of 500', async () => {
    const trades = Array(1500).fill({ ... });
    // Mock db.insert
    // Call upsertTrades
    // Expect db.insert called 3 times
  });
});

describe('runFullPipeline', () => {
  it('collects errors and returns PipelineResult', async () => {
    // Mock fetchSenateTransactions to throw
    // Call runFullPipeline
    // Expect result.success = false
    // Expect result.errors.length > 0
  });

  it('returns timing and counts', async () => {
    // Mock successful pipelines
    // Call runFullPipeline
    // Expect result.durationMs > 0
    // Expect result.totalInserted = senateInserted + houseInserted
  });
});
```

## Coverage Gaps (Current)

**Areas without automated tests:**
- `src/lib/house-scraper.ts` - XML parsing, House FD API integration
- `src/lib/senate-scraper.ts` - Senate eFTS API integration, transaction normalization
- `src/components/alerts-manager.tsx` - Form interaction, dedup UI, error states
- `src/app/api/stripe/webhook/route.ts` - Stripe event handling, subscription updates
- `src/lib/auth-session.ts` - Magic link validation, session creation
- `src/lib/alert-processor.ts` - Alert matching logic, notification sending

**Why tests are missing:**
- Heavy integration with external APIs (Senate, House, Stripe) requires mocking
- Real-time data validation (stock prices, congressional filings) requires test fixtures
- No test framework configured in package.json yet

**Recommended priority for tests:**
1. `parseAmountRange()`, `normalizeDate()`, `normalizeTradeType()` - utility functions, zero dependencies
2. `upsertTrades()` - core pipeline logic, testable with DB mocking
3. API route validation - easy to mock requests, high coverage impact
4. Component interactions - @testing-library/react for alerts-manager dedup logic

---

*Testing analysis: 2026-04-01*
