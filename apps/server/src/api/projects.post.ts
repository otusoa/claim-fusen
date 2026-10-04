import { defineHandler } from 'nitro'
import { createProjectSchema } from '@kari-fusen/schemas'
import { insertProject } from '../services/projects.js'
import { readJsonBody } from '../utils/validation.js'

export default defineHandler(async (event) => {
  const body = await readJsonBody(event, createProjectSchema)
  const project = await insertProject(body.title, body.description)
  event.res.status = 201
  return project
})
