import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import * as z from 'zod'
import { zValidator } from '@hono/zod-validator'
import { listProjects, insertProject } from './services/projects.js'

const app = new Hono()

const createProjectSchema = z.object({
  title: z.string().trim().min(1, 'titleは必須です'),
  description: z.string().nullish(),
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/projects', async (c) => {
  const projectList = await listProjects()
  return c.json(projectList)
})

app.post(
  '/projects',
  zValidator('json', createProjectSchema, (result, c) => {
    if (!result.success) {
      return c.text('Invalid input', 400)
    }
  }),
  async (c) => {
    // 検証済みのデータ。TypeScriptの型も推論される
    const body = c.req.valid('json')

    const newProject = await insertProject(body.title, body.description)

    return c.json(newProject, 201)
  },
)

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
