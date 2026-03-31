import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

// US Congress member (Senator or Representative)
export const politicians = pgTable('politicians', {
  id: uuid('id').primaryKey().defaultRandom(),
  bioguideId: varchar('bioguide_id', { length: 20 }).unique(), // Congress.gov bioguide ID
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 200 }).notNull(), // Full English name
  nameKr: varchar('name_kr', { length: 200 }), // Korean name
  party: varchar('party', { length: 50 }), // Republican, Democrat, Independent
  chamber: varchar('chamber', { length: 20 }).notNull(), // senate, house
  state: varchar('state', { length: 2 }), // 2-letter state code
  district: integer('district'), // House district number (null for Senate)
  committee: text('committee'), // Primary committee membership
  slug: varchar('slug', { length: 200 }).unique().notNull(), // URL slug e.g. nancy-pelosi
  photoUrl: text('photo_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Politician = typeof politicians.$inferSelect;
export type NewPolitician = typeof politicians.$inferInsert;
