import { pgTable, uuid, varchar, text, timestamp, numeric } from 'drizzle-orm/pg-core';

// US-listed stock/security traded by congress members
export const stocks = pgTable('stocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticker: varchar('ticker', { length: 20 }).unique().notNull(), // e.g. NVDA, AAPL
  nameEn: varchar('name_en', { length: 300 }).notNull(),
  nameKr: varchar('name_kr', { length: 300 }), // Korean company name
  sector: varchar('sector', { length: 100 }), // Technology, Healthcare, etc.
  industry: varchar('industry', { length: 150 }),
  currentPrice: numeric('current_price', { precision: 12, scale: 4 }),
  priceUpdatedAt: timestamp('price_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;
