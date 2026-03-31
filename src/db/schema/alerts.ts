import { pgTable, uuid, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// User alert subscriptions - notified when matching trades are disclosed
export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  alertType: varchar('alert_type', { length: 30 }).notNull(), // politician, stock, large_trade
  targetId: varchar('target_id', { length: 200 }), // politician slug, stock ticker, or null for all
  channel: varchar('channel', { length: 20 }).notNull(), // email, discord
  channelConfig: text('channel_config'), // JSON: discord webhook URL, etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('alerts_user_idx').on(table.userId),
  typeTargetIdx: index('alerts_type_target_idx').on(table.alertType, table.targetId),
}));

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
