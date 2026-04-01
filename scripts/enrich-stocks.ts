/**
 * Stock enrichment script - fetches sector/industry data from Financial Modeling Prep API.
 * Updates stocks where sector IS NULL.
 * Usage: npx tsx scripts/enrich-stocks.ts
 * Requires: FMP_API_KEY environment variable
 */
import 'dotenv/config';
import { db } from '../src/db/db-client';
import { stocks } from '../src/db/schema';
import { isNull, eq } from 'drizzle-orm';

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const BATCH_SIZE = 10;
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;
const REQUEST_DELAY_MS = 300; // FMP free tier rate limit buffer

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        console.warn(`[Enrich-Stocks] HTTP ${res.status} attempt ${attempt}/${retries} for ticker request`);
        if (attempt < retries) await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      return res;
    } catch (err) {
      console.warn(`[Enrich-Stocks] Network error attempt ${attempt}/${retries}:`, err);
      if (attempt < retries) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error(`[Enrich-Stocks] All ${retries} retries failed for request`);
}

interface FmpProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  description: string;
}

async function fetchStockProfile(ticker: string, apiKey: string): Promise<FmpProfile | null> {
  const url = `${FMP_BASE_URL}/profile/${ticker}?apikey=${apiKey}`;
  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      console.warn(`[Enrich-Stocks] Profile fetch failed for ${ticker}: HTTP ${res.status}`);
      return null;
    }
    const data: FmpProfile[] = await res.json();
    return data?.[0] ?? null;
  } catch (err) {
    console.warn(`[Enrich-Stocks] Error fetching profile for ${ticker}:`, err);
    return null;
  }
}

async function enrichStocks() {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new Error('FMP_API_KEY environment variable is not set');
  }

  console.log('[Enrich-Stocks] Fetching stocks with null sector...');
  const targets = await db
    .select()
    .from(stocks)
    .where(isNull(stocks.sector));

  if (targets.length === 0) {
    console.log('[Enrich-Stocks] No stocks need enrichment.');
    return;
  }

  console.log(`[Enrich-Stocks] Found ${targets.length} stocks to enrich.`);

  let enriched = 0;
  let failed = 0;

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    console.log(`[Enrich-Stocks] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(targets.length / BATCH_SIZE)}`);

    for (const stock of batch) {
      console.log(`[Enrich-Stocks] Fetching profile for ${stock.ticker}...`);
      const profile = await fetchStockProfile(stock.ticker, apiKey);

      if (!profile || (!profile.sector && !profile.industry)) {
        console.warn(`[Enrich-Stocks] No profile data for ${stock.ticker}`);
        failed++;
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      try {
        await db
          .update(stocks)
          .set({
            ...(profile.sector ? { sector: profile.sector } : {}),
            ...(profile.industry ? { industry: profile.industry } : {}),
            updatedAt: new Date(),
          })
          .where(eq(stocks.id, stock.id));

        console.log(`[Enrich-Stocks] Updated ${stock.ticker} -> sector: ${profile.sector}, industry: ${profile.industry}`);
        enriched++;
      } catch (err) {
        console.warn(`[Enrich-Stocks] DB update failed for ${stock.ticker}:`, err);
        failed++;
      }

      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`[Enrich-Stocks] Complete. Enriched: ${enriched}, Failed: ${failed}`);
}

async function main() {
  try {
    await enrichStocks();
    process.exit(0);
  } catch (err) {
    console.error('[Enrich-Stocks] Fatal error:', err);
    process.exit(1);
  }
}

main();
