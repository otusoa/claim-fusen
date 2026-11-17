import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { claimParamsSchema, updateClaimSchema } from '@kari-fusen/schemas'
import { updateClaim } from '~/services/claims'
import { parseInput, readJsonBody } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { claimId } = parseInput(claimParamsSchema, getRouterParams(event))
  const input = await readJsonBody(event, updateClaimSchema)
  const claim = await updateClaim(claimId, input)
  if (!claim) throw new HTTPError({ status: 404, message: 'Claim not found' })
  return claim
})
