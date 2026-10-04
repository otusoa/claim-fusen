import { defineHandler, HTTPError } from 'nitro'
import { createClaimSchema } from '@kari-fusen/schemas'
import { insertClaim } from '~/services/claims'
import { readJsonBody } from '~/utils/validation'

export default defineHandler(async (event) => {
  const body = await readJsonBody(event, createClaimSchema)
  const claim = await insertClaim(body)
  if (claim === null) {
    throw new HTTPError({ status: 404, message: 'Project not found' })
  }
  event.res.status = 201
  return claim
})
