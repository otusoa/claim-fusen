import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { evidenceParamsSchema } from '@kari-fusen/schemas'
import { findEvidenceById } from '~/services/evidences'
import { parseInput } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { evidenceId } = parseInput(evidenceParamsSchema, getRouterParams(event))
  const result = await findEvidenceById(evidenceId)
  if (!result) throw new HTTPError({ status: 404, message: 'Evidence not found' })
  return result
})
