import { defineHandler } from 'nitro'
import { createSourceSchema } from '@kari-fusen/schemas'
import { insertSource } from '../services/sources.js'
import { readJsonBody } from '../utils/validation.js'

export default defineHandler(async (event) => {
  const body = await readJsonBody(event, createSourceSchema)
  const source = await insertSource(body.title, body.type, body.year)
  event.res.status = 201
  return source
})
