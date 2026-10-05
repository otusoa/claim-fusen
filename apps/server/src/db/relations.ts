import { relations } from 'drizzle-orm';
import { claimEvidences, claims, evidences, projects, sources } from '~/db/schema/index';

export const projectsRelations = relations(projects, ({ many }) => ({
  // withで辿る関連を定義する。DBの外部キー制約はschema側で定義する。
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
  // 関係のtype・noteを持つ中間テーブルから、両方のデータを辿る。
  claim: one(claims, { fields: [claimEvidences.claimId], references: [claims.id] }),
  evidence: one(evidences, { fields: [claimEvidences.evidenceId], references: [evidences.id] }),
}));
