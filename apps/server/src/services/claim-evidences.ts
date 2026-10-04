import { eq } from 'drizzle-orm'
import type { CreateClaimEvidenceData } from '@kari-fusen/schemas'
import { db } from '../pool.js'
import { claims } from '../db/schema/claims.js'
import { evidences } from '../db/schema/evidences.js'

export async function insertClaimEvidence(
  claimId: string,
  input: CreateClaimEvidenceData,
) {
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
    return { error: 'project_mismatch' } as const
  }

  // 次の段階で、ここに関係の保存と重複処理を追加する。
  // 現段階は確認のみ。まだDBへ保存していない。
  return { claim, evidence }
}
