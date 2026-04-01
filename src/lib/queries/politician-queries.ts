import { db } from '@/db/db-client';
import { trades, politicians } from '@/db/schema';
import type { Politician } from '@/db/schema';
import { desc, eq, sql, count, and } from 'drizzle-orm';

export type PoliticianTrade = {
  id: string;
  stockTicker: string;
  stockName: string | null;
  tradeType: string;
  amountRange: string | null;
  amountMin: string | null;
  amountMax: string | null;
  tradeDate: string | null;
  disclosureDate: string;
  filingUrl: string | null;
};

export type PoliticianStatRow = {
  tradeType: string;
  tradeCount: number;
  totalAmountMin: string;
  totalAmountMax: string;
};

export type PoliticianTopStock = {
  stockTicker: string;
  stockName: string | null;
  tradeCount: number;
  buyCount: string;
  sellCount: string;
};

// Fetch a single politician by URL slug
export async function getPoliticianBySlug(slug: string): Promise<Politician | null> {
  const rows = await db
    .select()
    .from(politicians)
    .where(eq(politicians.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

// Fetch active politicians for static params generation
export async function getAllPoliticianSlugs(): Promise<{ slug: string }[]> {
  return db.select({ slug: politicians.slug }).from(politicians).where(eq(politicians.isActive, true));
}

// Full trade history for a politician, most recent first
export async function getPoliticianTrades(politicianId: string, limit: number = 100): Promise<PoliticianTrade[]> {
  return db
    .select({
      id: trades.id,
      stockTicker: trades.stockTicker,
      stockName: trades.stockName,
      tradeType: trades.tradeType,
      amountRange: trades.amountRange,
      amountMin: trades.amountMin,
      amountMax: trades.amountMax,
      tradeDate: trades.tradeDate,
      disclosureDate: trades.disclosureDate,
      filingUrl: trades.filingUrl,
    })
    .from(trades)
    .where(eq(trades.politicianId, politicianId))
    .orderBy(desc(trades.tradeDate))
    .limit(limit);
}

// Aggregate portfolio stats: total buy/sell counts and estimated amounts
export async function getPoliticianStats(politicianId: string): Promise<PoliticianStatRow[]> {
  const rows = await db
    .select({
      tradeType: trades.tradeType,
      tradeCount: count(trades.id),
      totalAmountMin: sql<string>`COALESCE(SUM(${trades.amountMin}), 0)`,
      totalAmountMax: sql<string>`COALESCE(SUM(${trades.amountMax}), 0)`,
    })
    .from(trades)
    .where(eq(trades.politicianId, politicianId))
    .groupBy(trades.tradeType);
  return rows;
}

// Most traded stocks by this politician
export async function getPoliticianTopStocks(politicianId: string, limit: number = 5): Promise<PoliticianTopStock[]> {
  return db
    .select({
      stockTicker: trades.stockTicker,
      stockName: trades.stockName,
      tradeCount: count(trades.id),
      buyCount: sql<string>`COUNT(*) FILTER (WHERE ${trades.tradeType} = 'buy')`,
      sellCount: sql<string>`COUNT(*) FILTER (WHERE ${trades.tradeType} = 'sell')`,
    })
    .from(trades)
    .where(and(eq(trades.politicianId, politicianId)))
    .groupBy(trades.stockTicker, trades.stockName)
    .orderBy(desc(count(trades.id)))
    .limit(limit);
}
