import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { claimEvidenceRelationParamsSchema, updateClaimEvidenceSchema } from '@kari-fusen/schemas'
import { updateClaimEvidence } from '~/services/claim-evidences'
import { parseInput, readJsonBody } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { claimId, relationId } = parseInput(claimEvidenceRelationParamsSchema, getRouterParams(event))
  const input = await readJsonBody(event, updateClaimEvidenceSchema)
  const result = await updateClaimEvidence(claimId, relationId, input)
  if ('error' in result) throw new HTTPError({
    status: result.error === 'relation_already_exists' ? 409 : 404,
    message: result.error === 'relation_already_exists' ? 'Relation already exists' : result.error === 'claim_not_found' ? 'Claim not found' : 'Relation not found',
  })
  return result.relation
})
