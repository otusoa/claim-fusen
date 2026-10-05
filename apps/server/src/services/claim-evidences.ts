import { eq } from 'drizzle-orm'
import type { CreateClaimEvidenceData } from '@kari-fusen/schemas'
import { db } from '~/pool.js'
import { claims } from '~/db/schema/claims.js'
import { evidences } from '~/db/schema/evidences.js'
import { claimEvidences } from '../db/schema/claim-evidences.js'

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
