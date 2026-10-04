import { defineHandler, HTTPError } from 'nitro'
import { createEvidenceSchema } from '@kari-fusen/schemas'
import { insertEvidence } from '../services/evidences.js'
import { readJsonBody } from '../utils/validation.js'

export default defineHandler(async (event) => {
  const body = await readJsonBody(event, createEvidenceSchema)
  const result = await insertEvidence(body)
  if ('error' in result) {
    throw new HTTPError({
      status: 404,
      message: result.error === 'project_not_found' ? 'Project not found' : 'Source not found',
    })
  }
  event.res.status = 201
  return result.evidence
})
