/**
 * Return calculation queries — estimated returns based on priceAtDisclosure vs currentPrice.
 * ALL return data is an estimate. Label prominently in UI.
 */
import { db } from '@/db/db-client';
import { trades, politicians, stocks } from '@/db/schema';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export type TradeReturn = {
  tradeId: string;
  stockTicker: string;
  stockName: string | null;
  tradeType: string;
  tradeDate: string | null;
  disclosureDate: string;
  priceAtDisclosure: string | null;
  currentPrice: string | null;
  // null when either price is missing
  estimatedReturnPct: number | null;
};

export type PoliticianAvgReturn = {
  politicianId: string;
  avgReturnPct: number | null;
  tradeCount: number;
};

export type TopReturnPolitician = {
  politicianSlug: string | null;
  politicianNameEn: string | null;
  politicianNameKr: string | null;
  politicianParty: string | null;
  politicianChamber: string | null;
  avgReturnPct: number;
  tradeCount: number;
};

/**
 * Per-trade estimated return % for a politician's buy trades.
 * Return = (currentPrice - priceAtDisclosure) / priceAtDisclosure * 100
 * Only includes trades where both prices are available.
 */
export async function getTradeReturns(politicianId: string): Promise<TradeReturn[]> {
  const rows = await db
    .select({
      tradeId: trades.id,
      stockTicker: trades.stockTicker,
      stockName: trades.stockName,
      tradeType: trades.tradeType,
      tradeDate: trades.tradeDate,
      disclosureDate: trades.disclosureDate,
      priceAtDisclosure: trades.priceAtDisclosure,
      currentPrice: stocks.currentPrice,
    })
    .from(trades)
    .leftJoin(stocks, eq(trades.stockTicker, stocks.ticker))
    .where(and(eq(trades.politicianId, politicianId), eq(trades.tradeType, 'buy')))
    .orderBy(desc(trades.disclosureDate));

  return rows.map((r) => {
    const entry = Number(r.priceAtDisclosure);
    const current = Number(r.currentPrice);
    const estimatedReturnPct =
      r.priceAtDisclosure && r.currentPrice && entry > 0
        ? Math.round(((current - entry) / entry) * 10000) / 100
        : null;
    return {
      tradeId: r.tradeId,
      stockTicker: r.stockTicker,
      stockName: r.stockName,
      tradeType: r.tradeType,
      tradeDate: r.tradeDate,
      disclosureDate: r.disclosureDate,
      priceAtDisclosure: r.priceAtDisclosure,
      currentPrice: r.currentPrice,
      estimatedReturnPct,
    };
  });
}

/**
 * Weighted average estimated return % for a politician over the last N days.
 * Weighted by amountMin (trade size proxy). Falls back to simple average.
 */
export async function getPoliticianAvgReturn(
  politicianId: string,
  days: number = 365,
): Promise<PoliticianAvgReturn> {
  const since = daysAgo(days);

  const rows = await db
    .select({
      priceAtDisclosure: trades.priceAtDisclosure,
      currentPrice: stocks.currentPrice,
      amountMin: trades.amountMin,
    })
    .from(trades)
    .leftJoin(stocks, eq(trades.stockTicker, stocks.ticker))
    .where(
      and(
        eq(trades.politicianId, politicianId),
        eq(trades.tradeType, 'buy'),
        gte(trades.disclosureDate, since),
      ),
    );

  const valid = rows.filter(
    (r) => r.priceAtDisclosure && r.currentPrice && Number(r.priceAtDisclosure) > 0,
  );

  if (valid.length === 0) {
    return { politicianId, avgReturnPct: null, tradeCount: valid.length };
  }

  let totalWeight = 0;
  let weightedReturn = 0;
  for (const r of valid) {
    const entry = Number(r.priceAtDisclosure);
    const current = Number(r.currentPrice);
    const ret = (current - entry) / entry;
    const weight = Number(r.amountMin) || 1;
    weightedReturn += ret * weight;
    totalWeight += weight;
  }

  const avgReturnPct = Math.round((weightedReturn / totalWeight) * 10000) / 100;
  return { politicianId, avgReturnPct, tradeCount: valid.length };
}

/**
 * Top N politicians ranked by average estimated return % over last `days` days.
 * Only politicians with >= 3 qualifying trades are included (reduces noise).
 */
export async function getTopReturnPoliticians(
  days: number = 365,
  limit: number = 10,
): Promise<TopReturnPolitician[]> {
  const since = daysAgo(days);

  // SQL: compute avg return inline to avoid N+1 queries
  const rows = await db
    .select({
      politicianSlug: politicians.slug,
      politicianNameEn: politicians.nameEn,
      politicianNameKr: politicians.nameKr,
      politicianParty: politicians.party,
      politicianChamber: politicians.chamber,
      avgReturnPct: sql<string>`
        AVG(
          CASE
            WHEN ${trades.priceAtDisclosure} IS NOT NULL
              AND ${stocks.currentPrice} IS NOT NULL
              AND ${trades.priceAtDisclosure}::numeric > 0
            THEN (${stocks.currentPrice}::numeric - ${trades.priceAtDisclosure}::numeric)
                 / ${trades.priceAtDisclosure}::numeric * 100
            ELSE NULL
          END
        )
      `,
      tradeCount: count(trades.id),
    })
    .from(trades)
    .leftJoin(politicians, eq(trades.politicianId, politicians.id))
    .leftJoin(stocks, eq(trades.stockTicker, stocks.ticker))
    .where(
      and(eq(trades.tradeType, 'buy'), gte(trades.disclosureDate, since)),
    )
    .groupBy(
      politicians.slug,
      politicians.nameEn,
      politicians.nameKr,
      politicians.party,
      politicians.chamber,
    )
    // Only include politicians with >= 3 qualifying buy trades (with valid prices)
    .having(sql`COUNT(CASE WHEN ${trades.priceAtDisclosure} IS NOT NULL AND ${stocks.currentPrice} IS NOT NULL AND ${trades.priceAtDisclosure}::numeric > 0 THEN 1 END) >= 3`)
    .orderBy(desc(sql`
      AVG(
        CASE
          WHEN ${trades.priceAtDisclosure} IS NOT NULL
            AND ${stocks.currentPrice} IS NOT NULL
            AND ${trades.priceAtDisclosure}::numeric > 0
          THEN (${stocks.currentPrice}::numeric - ${trades.priceAtDisclosure}::numeric)
               / ${trades.priceAtDisclosure}::numeric * 100
          ELSE NULL
        END
      )
    `))
    .limit(limit);

  return rows
    .filter((r) => r.avgReturnPct !== null)
    .map((r) => ({
      politicianSlug: r.politicianSlug,
      politicianNameEn: r.politicianNameEn,
      politicianNameKr: r.politicianNameKr,
      politicianParty: r.politicianParty,
      politicianChamber: r.politicianChamber,
      avgReturnPct: Math.round(Number(r.avgReturnPct) * 100) / 100,
      tradeCount: Number(r.tradeCount),
    }));
}
