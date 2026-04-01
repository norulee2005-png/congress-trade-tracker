import { eq, and, inArray, sql, gte } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { politicians, trades, stocks } from '@/db/schema';
import { nameToSlug } from './scraper-utils';
import { fetchSenateTransactions, normalizeSenateTransactions } from './senate-scraper';
import {
  fetchHouseFilingIndex,
  parseHouseFilingXml,
  normalizeHouseTransactions,
} from './house-scraper';
import { updateStockPricesInDb } from './stock-price-fetcher';
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
 * Run up to `limit` async tasks concurrently from an array.
 */
async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Bulk-insert normalized trades. Uses bulk SELECT → INSERT pattern to avoid 1500+
 * sequential round-trips. Single bulk INSERT at end with onConflictDoNothing.
 */
async function upsertTrades(normalizedTrades: NormalizedTrade[]): Promise<number> {
  // I10: filter out trades with null/empty filingId
  const validTrades = normalizedTrades.filter((t) => t.filingId && t.filingId.trim() !== '');
  if (validTrades.length === 0) return 0;

  // --- Step 1: Resolve politicians ---
  type PoliticianKey = string; // `${firstName}|${lastName}|${chamber}`
  const politicianKeys = new Map<PoliticianKey, { firstName: string; lastName: string; chamber: 'senate' | 'house' }>();
  for (const t of validTrades) {
    if (!t._firstName && !t._lastName) continue;
    const key: PoliticianKey = `${t._firstName}|${t._lastName}|${t._chamber}`;
    if (!politicianKeys.has(key)) {
      politicianKeys.set(key, { firstName: t._firstName, lastName: t._lastName, chamber: t._chamber });
    }
  }

  const politicianIdMap = new Map<PoliticianKey, string>();

  if (politicianKeys.size > 0) {
    const slugChamberPairs = Array.from(politicianKeys.entries()).map(([, v]) => ({
      slug: nameToSlug(`${v.firstName} ${v.lastName}`.trim()),
      chamber: v.chamber,
      firstName: v.firstName,
      lastName: v.lastName,
    }));

    // Bulk SELECT existing politicians
    const slugList = [...new Set(slugChamberPairs.map((p) => p.slug))];
    const existing = await db
      .select({ id: politicians.id, slug: politicians.slug, chamber: politicians.chamber })
      .from(politicians)
      .where(inArray(politicians.slug, slugList));

    const existingMap = new Map(existing.map((p) => [`${p.slug}|${p.chamber}`, p.id]));

    // Collect missing politicians
    const toInsert = slugChamberPairs.filter((p) => !existingMap.has(`${p.slug}|${p.chamber}`));

    if (toInsert.length > 0) {
      const inserted = await db
        .insert(politicians)
        .values(
          toInsert.map((p) => ({
            firstName: p.firstName,
            lastName: p.lastName,
            nameEn: `${p.firstName} ${p.lastName}`.trim(),
            chamber: p.chamber,
            slug: p.slug,
          }))
        )
        .onConflictDoNothing()
        .returning({ id: politicians.id, slug: politicians.slug, chamber: politicians.chamber });

      for (const p of inserted) {
        existingMap.set(`${p.slug}|${p.chamber}`, p.id);
      }

      // Re-query any that conflicted and weren't returned
      const stillMissing = toInsert.filter((p) => !existingMap.has(`${p.slug}|${p.chamber}`));
      if (stillMissing.length > 0) {
        const requeried = await db
          .select({ id: politicians.id, slug: politicians.slug, chamber: politicians.chamber })
          .from(politicians)
          .where(inArray(politicians.slug, stillMissing.map((p) => p.slug)));
        for (const p of requeried) {
          existingMap.set(`${p.slug}|${p.chamber}`, p.id);
        }
      }
    }

    for (const [key, v] of politicianKeys.entries()) {
      const slug = nameToSlug(`${v.firstName} ${v.lastName}`.trim());
      const id = existingMap.get(`${slug}|${v.chamber}`);
      if (id) politicianIdMap.set(key, id);
    }
  }

  // --- Step 2: Resolve stocks ---
  const tickerSet = new Set(validTrades.map((t) => t.stockTicker.toUpperCase()));
  const stockIdMap = new Map<string, string>();

  if (tickerSet.size > 0) {
    const tickerList = Array.from(tickerSet);
    const existingStocks = await db
      .select({ id: stocks.id, ticker: stocks.ticker })
      .from(stocks)
      .where(inArray(stocks.ticker, tickerList));

    const existingStockMap = new Map(existingStocks.map((s) => [s.ticker, s.id]));

    const missingTickers = tickerList.filter((tk) => !existingStockMap.has(tk));
    if (missingTickers.length > 0) {
      // Build name map from trades for hint
      const nameHints = new Map<string, string>();
      for (const t of validTrades) {
        if (t.stockName && !nameHints.has(t.stockTicker)) {
          nameHints.set(t.stockTicker, t.stockName);
        }
      }
      const insertedStocks = await db
        .insert(stocks)
        .values(missingTickers.map((tk) => ({ ticker: tk, nameEn: nameHints.get(tk) ?? tk })))
        .onConflictDoNothing()
        .returning({ id: stocks.id, ticker: stocks.ticker });

      for (const s of insertedStocks) {
        existingStockMap.set(s.ticker, s.id);
      }

      // Re-query conflicts
      const stillMissingStocks = missingTickers.filter((tk) => !existingStockMap.has(tk));
      if (stillMissingStocks.length > 0) {
        const requeried = await db
          .select({ id: stocks.id, ticker: stocks.ticker })
          .from(stocks)
          .where(inArray(stocks.ticker, stillMissingStocks));
        for (const s of requeried) {
          existingStockMap.set(s.ticker, s.id);
        }
      }
    }

    for (const [tk, id] of existingStockMap.entries()) {
      stockIdMap.set(tk, id);
    }
  }

  // --- Step 3: Bulk INSERT trades ---
  const tradeRows = validTrades
    .map((t) => {
      const politicianKey: PoliticianKey = `${t._firstName}|${t._lastName}|${t._chamber}`;
      const politicianId = politicianIdMap.get(politicianKey);
      if (!politicianId) return null;
      return {
        politicianId,
        stockId: stockIdMap.get(t.stockTicker.toUpperCase()) ?? null,
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
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (tradeRows.length === 0) return 0;

  // Insert in chunks to avoid query size limits
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
 * C5: Processes XML filings in concurrent batches of 8, skipping already-seen filings.
 * M10: Queries existing house filingId prefixes before processing to skip known filings.
 */
export async function runHousePipeline(year: number): Promise<number> {
  log.info('House pipeline started', { year });
  const filings = await fetchHouseFilingIndex(year);
  log.info('House filing index fetched', { filingCount: filings.length, year });

  // M10: Get set of existing house filing base IDs to skip already-processed filings
  const existingPrefixes = await db
    .select({ filingId: trades.filingId })
    .from(trades)
    .where(sql`${trades.filingId} LIKE 'house-%'`);
  const seenFilingIds = new Set(
    existingPrefixes
      .map((r) => r.filingId)
      .filter((id): id is string => id !== null)
      .map((id) => {
        // Extract base filing ID: house-{filingId}-... → filingId
        const parts = id.split('-');
        return parts.length >= 2 ? parts[1] : '';
      })
  );

  const newFilings = filings.filter((f) => !seenFilingIds.has(f.filingId));
  log.info('House filings after watermark filter', { total: filings.length, new: newFilings.length, skipped: filings.length - newFilings.length });

  // C5: Process in concurrent batches of 8
  const CONCURRENCY = 8;
  const tasks = newFilings.map((filing) => async () => {
    try {
      const transactions = await parseHouseFilingXml(filing);
      const normalized = normalizeHouseTransactions(transactions) as NormalizedTrade[];
      return upsertTrades(normalized);
    } catch (err) {
      log.error('House filing task failed', err, { filingId: filing.filingId });
      return 0;
    }
  });

  const counts = await pLimit(tasks, CONCURRENCY);
  const totalInserted = counts.reduce((sum, n) => sum + (n ?? 0), 0);

  log.info('House pipeline completed', { inserted: totalInserted, year });
  return totalInserted;
}

/**
 * Main entry point: run full pipeline for recent data.
 * Called by Vercel cron every 6 hours.
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

  // Fetch & update current prices for tickers traded in last 30 days
  try {
    const thirtyDaysAgoStr = fmt(thirtyDaysAgo);
    const recentTrades = await db
      .select({ ticker: trades.stockTicker })
      .from(trades)
      .where(gte(trades.disclosureDate, thirtyDaysAgoStr));
    const tickers = [...new Set(recentTrades.map((t) => t.ticker))];
    log.info('Updating stock prices', { tickerCount: tickers.length });
    await updateStockPricesInDb(tickers);

    // Backfill priceAtDisclosure for new trades that lack it
    // NOTE: Uses current price as approximation — accuracy improves as prices are captured closer to disclosure date
    await db.execute(sql`
      UPDATE trades t
      SET price_at_disclosure = s.current_price,
          updated_at = NOW()
      FROM stocks s
      WHERE t.stock_ticker = s.ticker
        AND t.price_at_disclosure IS NULL
        AND s.current_price IS NOT NULL
        AND t.disclosure_date >= ${thirtyDaysAgoStr}
    `);
    log.info('priceAtDisclosure backfill complete');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Price update failed: ${msg}`);
    log.error('Stock price update failed', err);
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
