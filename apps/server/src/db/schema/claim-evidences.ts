import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { claims } from './claims.js';
import { evidences } from './evidences.js';

export const claimEvidenceTypes = ['supports', 'challenges', 'contextualizes', 'corresponds'] as const;
export type ClaimEvidenceType = (typeof claimEvidenceTypes)[number];

export const claimEvidences = pgTable('claim_evidences', {
  id: uuid('id').defaultRandom().primaryKey(),
  claimId: uuid('claim_id').notNull().references(() => claims.id, { onDelete: 'cascade' }),
  evidenceId: uuid('evidence_id').notNull().references(() => evidences.id, { onDelete: 'cascade' }),
  // The enum option narrows TypeScript types; the database column remains text.
  type: text('type', { enum: claimEvidenceTypes }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('claim_evidences_claim_id_evidence_id_type_unique').on(table.claimId, table.evidenceId, table.type),
  index('claim_evidences_evidence_id_idx').on(table.evidenceId),
]);
