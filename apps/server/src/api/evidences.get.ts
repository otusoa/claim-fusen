import { defineHandler, HTTPError } from 'nitro'
import { getQuery } from 'nitro/h3'
import { listEvidencesQuerySchema } from '@kari-fusen/schemas'
import { listEvidencesByProject } from '~/services/evidences'
import { parseInput } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { projectId } = parseInput(listEvidencesQuerySchema, getQuery(event))
  const evidences = await listEvidencesByProject(projectId)
  if (evidences === null) throw new HTTPError({ status: 404, message: 'Project not found' })
  return evidences
})
