import { and, eq } from 'drizzle-orm'
import type { CreateClaimEvidenceData, UpdateClaimEvidenceData } from '@kari-fusen/schemas'
import { db } from '~/pool.js'
import { claims } from '~/db/schema/claims.js'
import { evidences } from '~/db/schema/evidences.js'
import { claimEvidences } from '../db/schema/claim-evidences.js'

function isRelationConflict(error: unknown) {
  const seen = new Set<unknown>()
  let cause = error
  while (cause && typeof cause === 'object' && !seen.has(cause)) {
    seen.add(cause)
    if ('code' in cause && cause.code === '23505' && 'constraint' in cause
      && cause.constraint === 'claim_evidences_claim_id_evidence_id_type_unique') return true
    cause = 'cause' in cause ? cause.cause : undefined
  }
  return false
}

export async function updateClaimEvidence(claimId: string, relationId: string, input: UpdateClaimEvidenceData) {
  try {
    return await db.transaction(async (tx) => {
      const [claim] = await tx.select({ id: claims.id }).from(claims).where(eq(claims.id, claimId)).for('key share')
      if (!claim) return { error: 'claim_not_found' } as const
      const [relation] = await tx.update(claimEvidences).set(input)
        .where(and(eq(claimEvidences.id, relationId), eq(claimEvidences.claimId, claimId))).returning()
      return relation ? { relation } : { error: 'relation_not_found' } as const
    })
  } catch (error) {
    if (isRelationConflict(error)) return { error: 'relation_already_exists' } as const
    throw error
  }
}

export async function deleteClaimEvidence(claimId: string, relationId: string) {
  return db.transaction(async (tx) => {
    const [claim] = await tx.select({ id: claims.id }).from(claims).where(eq(claims.id, claimId)).for('key share')
    if (!claim) return { error: 'claim_not_found' } as const
    const [relation] = await tx.delete(claimEvidences)
      .where(and(eq(claimEvidences.id, relationId), eq(claimEvidences.claimId, claimId))).returning({ id: claimEvidences.id })
    return relation ? { deleted: true } as const : { error: 'relation_not_found' } as const
  })
}

export async function insertClaimEvidence(
  claimId: string,
  input: CreateClaimEvidenceData,
) {
  // 参照先の不在は戻り値で伝え、HTTPステータスへの変換はRouteに任せる。
  const claim = await db.query.claims.findFirst({
    where: eq(claims.id, claimId),
  })
  if (!claim) {
    return { error: 'claim_not_found' } as const
  }

  const evidence = await db.query.evidences.findFirst({
    where: eq(evidences.id, input.evidenceId),
  })
  if (!evidence) {
    return { error: 'evidence_not_found' } as const
  }

  if (claim.projectId !== evidence.projectId) {
    // 別の研究Projectに属するデータ同士は結びつけない。
    return { error: 'project_mismatch' } as const
  }

  const [newRelation] = await db
    .insert(claimEvidences)
    .values({
      claimId,
      evidenceId: input.evidenceId,
      type: input.type,
      note: input.note,
    })
    .onConflictDoNothing({
      // 同時リクエストでも二重登録しないよう、DBの一意制約で重複を判定する。
      target: [
        claimEvidences.claimId,
        claimEvidences.evidenceId,
        claimEvidences.type,
      ],
    })
    .returning()

  if (!newRelation) {
    // 重複でINSERTが見送られると、returning()は空配列になる。
    return { error: 'relation_already_exists' } as const
  }

  return { relation: newRelation }
}
