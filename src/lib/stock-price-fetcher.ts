/**
 * Stock price fetcher — FMP API primary, Yahoo Finance v8 fallback.
 * Batches up to 50 tickers per FMP request. Module-level cache (5 min TTL).
 */
import { db } from '@/db/db-client';
import { stocks } from '@/db/schema';
import { inArray } from 'drizzle-orm';

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';
const CACHE_TTL_MS = 5 * 60 * 1000;
const FMP_BATCH_SIZE = 50;

// Module-level price cache: ticker → { price, fetchedAt }
const priceCache = new Map<string, { price: number; fetchedAt: number }>();

function getCached(ticker: string): number | null {
  const entry = priceCache.get(ticker);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    priceCache.delete(ticker);
    return null;
  }
  return entry.price;
}

function setCache(ticker: string, price: number) {
  priceCache.set(ticker, { price, fetchedAt: Date.now() });
}

// FMP /quote/{tickers} — supports comma-separated batch up to 50
async function fetchFmpBatch(tickers: string[], apiKey: string): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (let i = 0; i < tickers.length; i += FMP_BATCH_SIZE) {
    const batch = tickers.slice(i, i + FMP_BATCH_SIZE).join(',');
    const url = `${FMP_BASE}/quote/${encodeURIComponent(batch)}?apikey=${apiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data: Array<{ symbol: string; price: number }> = await res.json();
      for (const item of data) {
        if (item.symbol && typeof item.price === 'number') {
          result.set(item.symbol.toUpperCase(), item.price);
        }
      }
    } catch {
      // continue to next batch
    }
  }
  return result;
}

// Yahoo Finance v8 fallback — single ticker only
async function fetchYahooPriceFallback(ticker: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

/**
 * Fetch current prices for given tickers.
 * Returns a map of ticker → price for successfully fetched tickers.
 * Falls back to Yahoo Finance for tickers not in FMP response.
 */
export async function fetchPrices(tickers: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const uncached: string[] = [];

  for (const t of tickers) {
    const upper = t.toUpperCase();
    const cached = getCached(upper);
    if (cached !== null) {
      result.set(upper, cached);
    } else {
      uncached.push(upper);
    }
  }

  if (uncached.length === 0) return result;

  const apiKey = process.env.FMP_API_KEY;

  // Primary: FMP
  if (apiKey) {
    const fmpPrices = await fetchFmpBatch(uncached, apiKey);
    for (const [ticker, price] of fmpPrices) {
      result.set(ticker, price);
      setCache(ticker, price);
    }
  }

  // Fallback: Yahoo for any still missing
  const stillMissing = uncached.filter((t) => !result.has(t));
  for (const ticker of stillMissing) {
    const price = await fetchYahooPriceFallback(ticker);
    if (price !== null) {
      result.set(ticker, price);
      setCache(ticker, price);
    }
  }

  return result;
}

/**
 * Update stocks.currentPrice and stocks.priceUpdatedAt in the DB.
 * Called after each trade sync cron run.
 */
export async function updateStockPricesInDb(tickers: string[]): Promise<void> {
  if (tickers.length === 0) return;

  const prices = await fetchPrices(tickers);
  if (prices.size === 0) return;

  const now = new Date();

  // Batch update each ticker
  for (const [ticker, price] of prices) {
    await db
      .update(stocks)
      .set({ currentPrice: String(price), priceUpdatedAt: now, updatedAt: now })
      .where(inArray(stocks.ticker, [ticker]));
  }
}
