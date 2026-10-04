import { eq } from 'drizzle-orm'
import { db } from '../pool.js'
import { projects } from '../db/schema/projects.js'
import { claims, type ClaimStatus } from '../db/schema/claims.js'

type CreateClaimInput = {
  projectId: string
  title: string
  body?: string | null
  status: ClaimStatus
}

export async function insertClaim(input: CreateClaimInput) {
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