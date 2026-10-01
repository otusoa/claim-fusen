import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { sources } from './sources.js';

export const evidences = pgTable('evidences', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sourceId: uuid('source_id').notNull().references(() => sources.id, { onDelete: 'restrict' }),
  quote: text('quote'),
  summary: text('summary'),
  locator: text('locator'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('evidences_project_id_idx').on(table.projectId),
  index('evidences_source_id_idx').on(table.sourceId),
]);
