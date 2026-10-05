import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { claimEvidenceParamsSchema, createClaimEvidenceSchema } from '@kari-fusen/schemas'
import { insertClaimEvidence } from '~/services/claim-evidences.js'
import { parseInput, readJsonBody } from '~/utils/validation.js'

export default defineHandler(async (event) => {
  const { claimId } = parseInput(claimEvidenceParamsSchema, getRouterParams(event))
  const body = await readJsonBody(event, createClaimEvidenceSchema)
  const result = await insertClaimEvidence(claimId, body)

  // Serviceの結果を、APIのステータスと固定メッセージへ変換する。
  if ('error' in result) {
    switch (result.error) {
      case 'claim_not_found':
        throw new HTTPError({ status: 404, message: 'Claim not found' })
      case 'evidence_not_found':
        throw new HTTPError({ status: 404, message: 'Evidence not found' })
      case 'project_mismatch':
        throw new HTTPError({ status: 400, message: 'Claim and Evidence must belong to the same Project' })
      case 'relation_already_exists':
        throw new HTTPError({ status: 409, message: 'Relation already exists' })
    }
  }

  event.res.status = 201
  return result.relation
})
