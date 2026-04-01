import { pgTable, uuid, varchar, text, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { politicians } from './politicians';
import { stocks } from './stocks';

// Amount range buckets as reported in STOCK Act disclosures
// e.g. "$1,001 - $15,000", "$15,001 - $50,000", "$50,001 - $100,000", "$100,001 - $250,000", etc.
export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  politicianId: uuid('politician_id').notNull().references(() => politicians.id),
  stockId: uuid('stock_id').references(() => stocks.id), // nullable if stock not in our DB yet
  stockTicker: varchar('stock_ticker', { length: 20 }).notNull(),
  stockName: varchar('stock_name', { length: 300 }),
  tradeType: varchar('trade_type', { length: 10 }).notNull(), // buy, sell, exchange
  amountRange: varchar('amount_range', { length: 100 }), // raw disclosure range string
  amountMin: numeric('amount_min', { precision: 15, scale: 2 }), // parsed lower bound in USD
  amountMax: numeric('amount_max', { precision: 15, scale: 2 }), // parsed upper bound in USD
  tradeDate: date('trade_date'),
  disclosureDate: date('disclosure_date').notNull(),
  filingUrl: text('filing_url'), // source filing URL
  filingId: varchar('filing_id', { length: 100 }), // unique ID from source system
  comment: text('comment'), // optional filer comment
  priceAtDisclosure: numeric('price_at_disclosure', { precision: 12, scale: 4 }), // stock price on disclosure date (estimate)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  politicianIdx: index('trades_politician_idx').on(table.politicianId),
  stockTickerIdx: index('trades_stock_ticker_idx').on(table.stockTicker),
  tradeDateIdx: index('trades_trade_date_idx').on(table.tradeDate),
  disclosureDateIdx: index('trades_disclosure_date_idx').on(table.disclosureDate),
  filingIdUnique: uniqueIndex('trades_filing_id_unique').on(table.filingId),
  disclosureTradeTypeIdx: index('trades_disclosure_trade_type_idx').on(table.disclosureDate, table.tradeType),
  politicianTradeTypeIdx: index('trades_politician_trade_type_idx').on(table.politicianId, table.tradeType),
}));

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
