import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import * as z from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from './pool.js'
import { projects } from './db/schema/projects.js'

const app = new Hono()

const createProjectSchema = z.object({
  title: z.string().trim().min(1, 'titleは必須です'),
  description: z.string().nullish(),
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// 既存の const app = new Hono() より後に追加
app.get('/projects', async (c) => {
  const projects = await db.query.projects.findMany()
  return c.json(projects)
})

app.post(
  '/projects',
  zValidator('json', createProjectSchema),
  async (c) => {
    // 検証済みのデータ。TypeScriptの型も推論される
    const body = c.req.valid('json')

    const [newProject] = await db
      .insert(projects)
      .values({
        title: body.title,
        description: body.description,
      })
      .returning()

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
