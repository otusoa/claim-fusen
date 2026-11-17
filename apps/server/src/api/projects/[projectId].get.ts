import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { projectParamsSchema } from '@kari-fusen/schemas'
import { findProjectById } from '~/services/projects'
import { parseInput } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { projectId } = parseInput(projectParamsSchema, getRouterParams(event))
  const result = await findProjectById(projectId)
  if (!result) throw new HTTPError({ status: 404, message: 'Project not found' })
  return result
})
