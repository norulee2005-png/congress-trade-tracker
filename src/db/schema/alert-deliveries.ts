import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { alerts } from './alerts';
import { trades } from './trades';

export const alertDeliveries = pgTable('alert_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  tradeId: uuid('trade_id').notNull().references(() => trades.id, { onDelete: 'cascade' }),
  sentAt: timestamp('sent_at').defaultNow(),
}, (table) => ({
  alertTradeUnique: uniqueIndex('alert_deliveries_alert_trade_unique').on(table.alertId, table.tradeId),
}));

export type AlertDelivery = typeof alertDeliveries.$inferSelect;
export type NewAlertDelivery = typeof alertDeliveries.$inferInsert;
