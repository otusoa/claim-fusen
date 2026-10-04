import { eq } from 'drizzle-orm'
import { db } from '../pool.js'
import { projects } from '../db/schema/projects.js'
import { claims } from '../db/schema/claims.js'
import type { CreateClaimData } from '@kari-fusen/schemas'

export async function insertClaim(input: CreateClaimData) {
  // 外部キーエラーにする前にProjectを確認し、不在をRouteへ伝える。
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, input.projectId),
  })

  if (!project) {
    return null
  }

  const [newClaim] = await db
    .insert(claims)
    .values({
      projectId: input.projectId,
      title: input.title,
      body: input.body ?? null,
      status: input.status,
    })
    .returning()
  return newClaim
}
