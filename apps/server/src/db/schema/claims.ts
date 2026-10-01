import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';

export const claimStatuses = ['draft', 'active', 'archived'] as const;
export type ClaimStatus = (typeof claimStatuses)[number];

export const claims = pgTable('claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body'),
  status: text('status', { enum: claimStatuses }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('claims_project_id_idx').on(table.projectId)]);
