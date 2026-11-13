import { defineHandler, HTTPError } from 'nitro'
import { getQuery } from 'nitro/h3'
import { listClaimsQuerySchema } from '@kari-fusen/schemas'
import { listClaimsByProject } from '~/services/claims'
import { parseInput } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { projectId } = parseInput(listClaimsQuerySchema, getQuery(event))
  const claims = await listClaimsByProject(projectId)
  if (claims === null) {
    throw new HTTPError({ status: 404, message: 'Project not found' })
  }
  return claims
})
