import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { sourceParamsSchema, updateSourceSchema } from '@kari-fusen/schemas'
import { updateSource } from '~/services/sources'
import { parseInput, readJsonBody } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { sourceId } = parseInput(sourceParamsSchema, getRouterParams(event))
  const input = await readJsonBody(event, updateSourceSchema)
  const result = await updateSource(sourceId, input)
  if (!result) throw new HTTPError({ status: 404, message: 'Source not found' })
  return result
})
