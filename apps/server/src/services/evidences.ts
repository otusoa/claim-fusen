import { eq } from 'drizzle-orm'
import { db } from '../pool.js'
import { projects } from '../db/schema/projects.js'
import { sources } from '../db/schema/sources.js'
import { evidences } from '../db/schema/evidences.js'

import type { CreateEvidenceData } from '@kari-fusen/schemas'

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
