import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { claimParamsSchema } from '@kari-fusen/schemas'
import { findClaimById } from '~/services/claims'
import { parseInput } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { claimId } = parseInput(claimParamsSchema, getRouterParams(event))
  const claim = await findClaimById(claimId)
  if (claim === null) {
    throw new HTTPError({ status: 404, message: 'Claim not found' })
  }
  return claim
})
