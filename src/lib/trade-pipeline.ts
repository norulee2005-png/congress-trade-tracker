import { eq, and } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { politicians, trades, stocks } from '@/db/schema';
import { nameToSlug } from './scraper-utils';
import { fetchSenateTransactions, normalizeSenateTransactions } from './senate-scraper';
import {
  fetchHouseFilingIndex,
  parseHouseFilingXml,
  normalizeHouseTransactions,
} from './house-scraper';
import { createLogger } from './structured-logger';

const log = createLogger('trade-pipeline');

export interface PipelineResult {
  success: boolean;
  senateInserted: number;
  houseInserted: number;
  totalInserted: number;
  errors: string[];
  durationMs: number;
  completedAt: string;
}

type NormalizedTrade = {
  stockTicker: string;
  stockName: string | null;
  tradeType: 'buy' | 'sell' | 'exchange';
  amountRange: string | null;
  amountMin: string | null;
  amountMax: string | null;
  tradeDate: string | null;
  disclosureDate: string;
  filingUrl: string | null;
  filingId: string | null;
  comment: string | null;
  _firstName: string;
  _lastName: string;
  _chamber: 'senate' | 'house';
};

/**
 * Upsert a politician record, returning their DB id.
 * Creates a new record if none exists for this name + chamber combo.
 */
async function upsertPolitician(
  firstName: string,
  lastName: string,
  chamber: 'senate' | 'house'
): Promise<string | null> {
  if (!firstName && !lastName) return null;

  const fullName = `${firstName} ${lastName}`.trim();
  const slug = nameToSlug(fullName);

  // Check if politician already exists
  const existing = await db
    .select({ id: politicians.id })
    .from(politicians)
    .where(and(eq(politicians.slug, slug), eq(politicians.chamber, chamber)))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  // Insert new politician (minimal info — can be enriched later)
  const inserted = await db
    .insert(politicians)
    .values({
      firstName,
      lastName,
      nameEn: fullName,
      chamber,
      slug,
    })
    .onConflictDoNothing()
    .returning({ id: politicians.id });

  return inserted[0]?.id ?? null;
}

/**
 * Upsert stock record, returning its DB id.
 */
async function upsertStock(ticker: string, name?: string | null): Promise<string | null> {
  if (!ticker) return null;

  const existing = await db
    .select({ id: stocks.id })
    .from(stocks)
    .where(eq(stocks.ticker, ticker))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const inserted = await db
    .insert(stocks)
    .values({ ticker, nameEn: name ?? ticker })
    .onConflictDoNothing()
    .returning({ id: stocks.id });

  return inserted[0]?.id ?? null;
}

/**
 * Insert normalized trades into the database, skipping duplicates by filingId.
 */
async function upsertTrades(normalizedTrades: NormalizedTrade[]): Promise<number> {
  let inserted = 0;

  for (const t of normalizedTrades) {
    try {
      const politicianId = await upsertPolitician(t._firstName, t._lastName, t._chamber);
      if (!politicianId) continue;

      const stockId = await upsertStock(t.stockTicker, t.stockName);

      await db
        .insert(trades)
        .values({
          politicianId,
          stockId,
          stockTicker: t.stockTicker,
          stockName: t.stockName,
          tradeType: t.tradeType,
          amountRange: t.amountRange,
          amountMin: t.amountMin,
          amountMax: t.amountMax,
          tradeDate: t.tradeDate,
          disclosureDate: t.disclosureDate,
          filingUrl: t.filingUrl,
          filingId: t.filingId,
          comment: t.comment,
        })
        .onConflictDoNothing();

      inserted++;
    } catch (err) {
      log.error('Failed to insert trade', err, { filingId: t.filingId, ticker: t.stockTicker });
    }
  }

  return inserted;
}

/**
 * Run the full Senate scrape pipeline for a date range.
 */
export async function runSenatePipeline(fromDate: string, toDate: string): Promise<number> {
  log.info('Senate pipeline started', { fromDate, toDate });
  const raw = await fetchSenateTransactions(fromDate, toDate);
  log.info('Senate raw transactions fetched', { count: raw.length });

  const normalized = normalizeSenateTransactions(raw) as NormalizedTrade[];
  log.info('Senate transactions normalized', { validCount: normalized.length, filteredOut: raw.length - normalized.length });

  const count = await upsertTrades(normalized);
  log.info('Senate pipeline completed', { inserted: count });
  return count;
}

/**
 * Run the full House scrape pipeline for a given year.
 */
export async function runHousePipeline(year: number): Promise<number> {
  log.info('House pipeline started', { year });
  const filings = await fetchHouseFilingIndex(year);
  log.info('House filing index fetched', { filingCount: filings.length, year });

  let totalInserted = 0;
  for (const filing of filings) {
    const transactions = await parseHouseFilingXml(filing);
    const normalized = normalizeHouseTransactions(transactions) as NormalizedTrade[];
    const count = await upsertTrades(normalized);
    totalInserted += count;
  }

  log.info('House pipeline completed', { inserted: totalInserted, year });
  return totalInserted;
}

/**
 * Main entry point: run full pipeline for recent data.
 * Called by Vercel cron every 6 hours.
 * Returns structured result for monitoring.
 */
export async function runFullPipeline(): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let senateInserted = 0;
  let houseInserted = 0;

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  log.info('Full pipeline started', { fromDate: fmt(thirtyDaysAgo), toDate: fmt(today) });

  try {
    senateInserted = await runSenatePipeline(fmt(thirtyDaysAgo), fmt(today));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Senate pipeline failed: ${msg}`);
    log.error('Senate pipeline failed', err);
  }

  try {
    houseInserted = await runHousePipeline(today.getFullYear());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`House pipeline failed: ${msg}`);
    log.error('House pipeline failed', err);
  }

  // Also catch prior year data near year boundary
  if (today.getMonth() === 0) {
    try {
      houseInserted += await runHousePipeline(today.getFullYear() - 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`House prior-year pipeline failed: ${msg}`);
      log.error('House prior-year pipeline failed', err);
    }
  }

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
