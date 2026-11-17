import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { projectParamsSchema, updateProjectSchema } from '@kari-fusen/schemas'
import { updateProject } from '~/services/projects'
import { parseInput, readJsonBody } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { projectId } = parseInput(projectParamsSchema, getRouterParams(event))
  const input = await readJsonBody(event, updateProjectSchema)
  const result = await updateProject(projectId, input)
  if (!result) throw new HTTPError({ status: 404, message: 'Project not found' })
  return result
})
