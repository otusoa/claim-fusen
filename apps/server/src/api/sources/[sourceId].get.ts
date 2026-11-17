import { defineHandler, HTTPError } from 'nitro'
import { getRouterParams } from 'nitro/h3'
import { sourceParamsSchema } from '@kari-fusen/schemas'
import { findSourceById } from '~/services/sources'
import { parseInput } from '~/utils/validation'

export default defineHandler(async (event) => {
  const { sourceId } = parseInput(sourceParamsSchema, getRouterParams(event))
  const result = await findSourceById(sourceId)
  if (!result) throw new HTTPError({ status: 404, message: 'Source not found' })
  return result
})
