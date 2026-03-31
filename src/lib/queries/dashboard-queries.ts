import { db } from '@/db/db-client';
import { trades, politicians, stocks } from '@/db/schema';
import { desc, gte, sql, and, eq, count } from 'drizzle-orm';

// Fetch recent trades within the last N days
export async function getRecentTrades(days: number = 7, limit: number = 50) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

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
      politicianId: trades.politicianId,
      politicianSlug: politicians.slug,
      politicianNameEn: politicians.nameEn,
      politicianNameKr: politicians.nameKr,
      politicianParty: politicians.party,
      politicianChamber: politicians.chamber,
    })
    .from(trades)
    .leftJoin(politicians, eq(trades.politicianId, politicians.id))
    .where(gte(trades.disclosureDate, sinceStr))
    .orderBy(desc(trades.disclosureDate))
    .limit(limit);
}

// 7-day and 30-day stats: buy/sell counts and amounts
export async function getTradeStats(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const rows = await db
    .select({
      tradeType: trades.tradeType,
      tradeCount: count(trades.id),
      totalAmountMin: sql<string>`SUM(${trades.amountMin})`,
      totalAmountMax: sql<string>`SUM(${trades.amountMax})`,
    })
    .from(trades)
    .where(gte(trades.disclosureDate, sinceStr))
    .groupBy(trades.tradeType);

  return rows;
}

// Top 10 most-purchased stocks by congress members in the last 30 days
export async function getTopBoughtStocks(limit: number = 10) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().split('T')[0];

  return db
    .select({
      stockTicker: trades.stockTicker,
      stockName: trades.stockName,
      buyCount: count(trades.id),
      totalAmountMin: sql<string>`SUM(${trades.amountMin})`,
    })
    .from(trades)
    .where(and(gte(trades.disclosureDate, sinceStr), eq(trades.tradeType, 'buy')))
    .groupBy(trades.stockTicker, trades.stockName)
    .orderBy(desc(count(trades.id)))
    .limit(limit);
}

// Fetch live USD/KRW exchange rate from a free public API
export async function getKrwRate(): Promise<number | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 }, // cache for 1 hour
    });
    if (!res.ok) return null;
    const data = await res.json() as { rates?: Record<string, number> };
    return data.rates?.KRW ?? null;
  } catch {
    return null;
  }
}
