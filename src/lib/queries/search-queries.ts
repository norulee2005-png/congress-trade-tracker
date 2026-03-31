import { db } from '@/db/db-client';
import { trades, politicians, stocks } from '@/db/schema';
import { ilike, or, eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export interface TradeFilters {
  q?: string;          // free-text: politician name or ticker
  party?: string;      // Republican, Democrat, Independent
  chamber?: string;    // senate, house
  tradeType?: string;  // buy, sell, exchange
  amountMin?: number;  // USD lower bound
  amountMax?: number;  // USD upper bound
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?: string;     // YYYY-MM-DD
  sector?: string;     // Technology, Healthcare, etc.
  limit?: number;
  offset?: number;
}

export async function searchTrades(filters: TradeFilters) {
  const {
    q,
    party,
    chamber,
    tradeType,
    amountMin,
    amountMax,
    dateFrom,
    dateTo,
    sector,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = [];

  // Free-text: match politician name (en/kr) or stock ticker/name
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(politicians.nameEn, pattern),
        ilike(politicians.nameKr, pattern),
        ilike(trades.stockTicker, pattern),
        ilike(trades.stockName, pattern),
      )
    );
  }

  if (party) conditions.push(eq(politicians.party, party));
  if (chamber) conditions.push(eq(politicians.chamber, chamber));
  if (tradeType) conditions.push(eq(trades.tradeType, tradeType));
  if (amountMin != null) conditions.push(gte(trades.amountMin, String(amountMin)));
  if (amountMax != null) conditions.push(lte(trades.amountMax, String(amountMax)));
  if (dateFrom) conditions.push(gte(trades.tradeDate, dateFrom));
  if (dateTo) conditions.push(lte(trades.tradeDate, dateTo));
  if (sector) conditions.push(eq(stocks.sector, sector));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: trades.id,
      stockTicker: trades.stockTicker,
      stockName: trades.stockName,
      tradeType: trades.tradeType,
      amountRange: trades.amountRange,
      tradeDate: trades.tradeDate,
      disclosureDate: trades.disclosureDate,
      politicianSlug: politicians.slug,
      politicianNameEn: politicians.nameEn,
      politicianNameKr: politicians.nameKr,
      politicianParty: politicians.party,
      politicianChamber: politicians.chamber,
      stockSector: stocks.sector,
    })
    .from(trades)
    .leftJoin(politicians, eq(trades.politicianId, politicians.id))
    .leftJoin(stocks, eq(trades.stockTicker, stocks.ticker))
    .where(whereClause)
    .orderBy(desc(trades.disclosureDate))
    .limit(limit)
    .offset(offset);
}

// Return all unique sectors from stocks table (for filter dropdown)
export async function getAllSectors() {
  const rows = await db
    .selectDistinct({ sector: stocks.sector })
    .from(stocks)
    .where(sql`${stocks.sector} IS NOT NULL`);
  return rows.map((r) => r.sector).filter(Boolean) as string[];
}
