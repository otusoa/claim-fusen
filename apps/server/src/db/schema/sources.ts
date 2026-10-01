import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  type: text('type'),
  year: integer('year'),
  url: text('url'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
