import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { claimEvidenceRelationParamsSchema } from '@kari-fusen/schemas'
import { deleteClaimEvidence } from '~/services/claim-evidences'
import { parseInput } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { claimId, relationId } = parseInput(claimEvidenceRelationParamsSchema, getRouterParams(event))
  const result = await deleteClaimEvidence(claimId, relationId)
  if ('error' in result) throw new HTTPError({ status: 404,
    message: result.error === 'claim_not_found' ? 'Claim not found' : 'Relation not found' })
  return new Response(null, { status: 204 })
})
