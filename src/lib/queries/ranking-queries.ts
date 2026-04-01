import { db } from '@/db/db-client';
import { trades, politicians } from '@/db/schema';
import { desc, gte, eq, and, sql, count } from 'drizzle-orm';

export type ActiveTrader = {
  politicianSlug: string | null;
  politicianNameEn: string | null;
  politicianNameKr: string | null;
  politicianParty: string | null;
  politicianChamber: string | null;
  tradeCount: number;
};

export type MostTradedStock = {
  stockTicker: string;
  stockName: string | null;
  tradeCount: number;
  buyCount: string;
  sellCount: string;
};

export type PartyBuySellRow = {
  party: string | null;
  tradeType: string;
  tradeCount: number;
};

export type TopBuyerRow = {
  politicianSlug: string | null;
  politicianNameEn: string | null;
  politicianNameKr: string | null;
  politicianParty: string | null;
  politicianChamber: string | null;
  totalAmountMin: string;
  totalAmountMax: string;
  tradeCount: number;
};

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// Most active traders (by trade count) in the last N days
export async function getMostActiveTraders(days: number = 30, limit: number = 10): Promise<ActiveTrader[]> {
  const since = daysAgo(days);
  return db
    .select({
      politicianSlug: politicians.slug,
      politicianNameEn: politicians.nameEn,
      politicianNameKr: politicians.nameKr,
      politicianParty: politicians.party,
      politicianChamber: politicians.chamber,
      tradeCount: count(trades.id),
    })
    .from(trades)
    .leftJoin(politicians, eq(trades.politicianId, politicians.id))
    .where(gte(trades.disclosureDate, since))
    .groupBy(
      politicians.slug,
      politicians.nameEn,
      politicians.nameKr,
      politicians.party,
      politicians.chamber,
    )
    .orderBy(desc(count(trades.id)))
    .limit(limit);
}

// Most traded stocks overall (by trade count)
export async function getMostTradedStocks(limit: number = 20): Promise<MostTradedStock[]> {
  return db
    .select({
      stockTicker: trades.stockTicker,
      stockName: trades.stockName,
      tradeCount: count(trades.id),
      buyCount: sql<string>`COUNT(*) FILTER (WHERE ${trades.tradeType} = 'buy')`,
      sellCount: sql<string>`COUNT(*) FILTER (WHERE ${trades.tradeType} = 'sell')`,
    })
    .from(trades)
    .groupBy(trades.stockTicker, trades.stockName)
    .orderBy(desc(count(trades.id)))
    .limit(limit);
}

// Party-level buy vs sell counts
export async function getPartyBuySellRatio(): Promise<PartyBuySellRow[]> {
  return db
    .select({
      party: politicians.party,
      tradeType: trades.tradeType,
      tradeCount: count(trades.id),
    })
    .from(trades)
    .leftJoin(politicians, eq(trades.politicianId, politicians.id))
    .groupBy(politicians.party, trades.tradeType)
    .orderBy(politicians.party);
}

// Top politicians by total estimated buy amount in the current calendar month
export async function getTopBuyersByAmount(limit: number = 10): Promise<TopBuyerRow[]> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  return db
    .select({
      politicianSlug: politicians.slug,
      politicianNameEn: politicians.nameEn,
      politicianNameKr: politicians.nameKr,
      politicianParty: politicians.party,
      politicianChamber: politicians.chamber,
      totalAmountMin: sql<string>`COALESCE(SUM(${trades.amountMin}), 0)`,
      totalAmountMax: sql<string>`COALESCE(SUM(${trades.amountMax}), 0)`,
      tradeCount: count(trades.id),
    })
    .from(trades)
    .leftJoin(politicians, eq(trades.politicianId, politicians.id))
    .where(and(eq(trades.tradeType, 'buy'), gte(trades.disclosureDate, monthStart)))
    .groupBy(
      politicians.slug,
      politicians.nameEn,
      politicians.nameKr,
      politicians.party,
      politicians.chamber,
    )
    .orderBy(desc(sql`COALESCE(SUM(${trades.amountMin}), 0)`))
    .limit(limit);
}
