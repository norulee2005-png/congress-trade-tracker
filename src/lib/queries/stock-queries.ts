import { db } from '@/db/db-client';
import { trades, politicians, stocks } from '@/db/schema';
import { desc, eq, sql, count } from 'drizzle-orm';

// Fetch stock record by ticker
export async function getStockByTicker(ticker: string) {
  const rows = await db
    .select()
    .from(stocks)
    .where(eq(stocks.ticker, ticker.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

// All unique tickers that have at least one trade (for static params)
export async function getAllTradedTickers() {
  return db
    .selectDistinct({ stockTicker: trades.stockTicker })
    .from(trades);
}

// All trades for a specific stock ticker, joined with politician info
export async function getStockTrades(ticker: string, limit: number = 100) {
  return db
    .select({
      id: trades.id,
      tradeType: trades.tradeType,
      amountRange: trades.amountRange,
      amountMin: trades.amountMin,
      amountMax: trades.amountMax,
      tradeDate: trades.tradeDate,
      disclosureDate: trades.disclosureDate,
      filingUrl: trades.filingUrl,
      politicianSlug: politicians.slug,
      politicianNameEn: politicians.nameEn,
      politicianNameKr: politicians.nameKr,
      politicianParty: politicians.party,
      politicianChamber: politicians.chamber,
    })
    .from(trades)
    .leftJoin(politicians, eq(trades.politicianId, politicians.id))
    .where(eq(trades.stockTicker, ticker.toUpperCase()))
    .orderBy(desc(trades.tradeDate))
    .limit(limit);
}

// Buy/sell trend counts per month for a ticker
export async function getStockTradeTrend(ticker: string) {
  return db
    .select({
      month: sql<string>`TO_CHAR(${trades.tradeDate}, 'YYYY-MM')`,
      buyCount: sql<string>`COUNT(*) FILTER (WHERE ${trades.tradeType} = 'buy')`,
      sellCount: sql<string>`COUNT(*) FILTER (WHERE ${trades.tradeType} = 'sell')`,
    })
    .from(trades)
    .where(eq(trades.stockTicker, ticker.toUpperCase()))
    .groupBy(sql`TO_CHAR(${trades.tradeDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${trades.tradeDate}, 'YYYY-MM')`);
}

// Summary stats: total buy/sell counts for a ticker
export async function getStockStats(ticker: string) {
  const rows = await db
    .select({
      tradeType: trades.tradeType,
      tradeCount: count(trades.id),
      uniquePoliticians: sql<string>`COUNT(DISTINCT ${trades.politicianId})`,
    })
    .from(trades)
    .where(eq(trades.stockTicker, ticker.toUpperCase()))
    .groupBy(trades.tradeType);
  return rows;
}
