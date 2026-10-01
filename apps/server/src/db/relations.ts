import { relations } from 'drizzle-orm';
import { claimEvidences, claims, evidences, projects, sources } from './schema/index.js';

export const projectsRelations = relations(projects, ({ many }) => ({
  claims: many(claims),
  evidences: many(evidences),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  project: one(projects, { fields: [claims.projectId], references: [projects.id] }),
  claimEvidences: many(claimEvidences),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  evidences: many(evidences),
}));

export const evidencesRelations = relations(evidences, ({ one, many }) => ({
  project: one(projects, { fields: [evidences.projectId], references: [projects.id] }),
  source: one(sources, { fields: [evidences.sourceId], references: [sources.id] }),
  claimEvidences: many(claimEvidences),
}));

export const claimEvidencesRelations = relations(claimEvidences, ({ one }) => ({
  claim: one(claims, { fields: [claimEvidences.claimId], references: [claims.id] }),
  evidence: one(evidences, { fields: [claimEvidences.evidenceId], references: [evidences.id] }),
}));
