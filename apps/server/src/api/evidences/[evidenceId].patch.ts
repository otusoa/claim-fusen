import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { evidenceParamsSchema, updateEvidenceSchema } from '@kari-fusen/schemas'
import { updateEvidence } from '~/services/evidences'
import { parseInput, readJsonBody } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { evidenceId } = parseInput(evidenceParamsSchema, getRouterParams(event))
  const input = await readJsonBody(event, updateEvidenceSchema)
  const result = await updateEvidence(evidenceId, input)
  if ('error' in result) {
    throw new HTTPError({ status: result.error === 'invalid_input' ? 400 : 404,
      message: result.error === 'invalid_input' ? 'Invalid input' : result.error === 'source_not_found' ? 'Source not found' : 'Evidence not found' })
  }
  return result.evidence
})
