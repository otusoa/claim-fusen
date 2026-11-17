import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../pool.js'
import { projects } from '../db/schema/projects.js'
import { sources } from '../db/schema/sources.js'
import { evidences } from '../db/schema/evidences.js'

import { createEvidenceSchema, type CreateEvidenceData, type UpdateEvidenceData } from '@kari-fusen/schemas'

export async function findEvidenceById(evidenceId: string) {
  return await db.query.evidences.findFirst({ where: eq(evidences.id, evidenceId), with: { source: true } }) ?? null
}

export async function updateEvidence(evidenceId: string, input: UpdateEvidenceData) {
  return db.transaction(async (tx) => {
    // 行をロックして、同時更新でも引用と要約の両方が消えないようにする。
    const [existing] = await tx.select().from(evidences).where(eq(evidences.id, evidenceId)).for('update')
    if (!existing) return { error: 'evidence_not_found' } as const
    const patch = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
    if (!createEvidenceSchema.safeParse({ ...existing, ...patch }).success) return { error: 'invalid_input' } as const
    if (input.sourceId !== undefined) {
      const [source] = await tx.select({ id: sources.id }).from(sources).where(eq(sources.id, input.sourceId)).for('key share')
      if (!source) return { error: 'source_not_found' } as const
    }
    const [evidence] = await tx.update(evidences).set({ ...input, updatedAt: new Date() })
      .where(eq(evidences.id, evidenceId)).returning()
    return { evidence: evidence! }
  })
}

export async function listEvidencesByProject(projectId: string) {
  const project = await db.query.projects.findFirst({ columns: { id: true }, where: eq(projects.id, projectId) })
  if (!project) return null
  return db.query.evidences.findMany({
    where: eq(evidences.projectId, projectId),
    with: { source: true },
    orderBy: [desc(evidences.updatedAt), asc(evidences.id)],
  })
}

export async function insertEvidence(input: CreateEvidenceData) {
  // ProjectとSourceのどちらがないかを区別してRouteへ伝える。
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, input.projectId),
  })
  if (!project) {
    return { error: 'project_not_found' } as const
  }

  const source = await db.query.sources.findFirst({
    where: eq(sources.id, input.sourceId),
  })
  if (!source) {
    return { error: 'source_not_found' } as const
  }

  const [newEvidence] = await db
    // 引用と要約を分けて保存し、引用の空白もそのまま保持する。
    .insert(evidences)
    .values(input)
    .returning()
  return { evidence: newEvidence }
}
