import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  createProjectSchema,
  createSourceSchema,
  createClaimSchema,
  createEvidenceSchema,
  createClaimEvidenceSchema,
  claimEvidenceParamsSchema,
} from '@kari-fusen/schemas'
import { listProjects, insertProject } from './services/projects.js'
import { insertSource } from './services/sources.js'
import { insertClaim } from './services/claims.js'
import { insertEvidence } from './services/evidences.js'
import { insertClaimEvidence } from './services/claim-evidences.js'

const app = new Hono()
// Routeは入力の検証とHTTPレスポンス、ServiceはDB操作と参照先の確認を担当する。

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/api/projects', async (c) => {
  const projectList = await listProjects()
  return c.json(projectList)
})

app.post(
  '/api/projects',
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

app.post(
  '/api/sources',
  zValidator('json', createSourceSchema, (result, c) => {
    if (!result.success) {
      return c.text('Invalid input', 400)
    }
  }),
  async (c) => {
    const body = c.req.valid('json')
    const newSource = await insertSource(body.title, body.type, body.year)
    return c.json(newSource, 201)
  },
)

app.post(
  '/api/claims',
  zValidator('json', createClaimSchema, (result, c) => {
    if (!result.success) {
      return c.text('Invalid input', 400)
    }
  }),
  async (c) => {
    const body = c.req.valid('json')
    const newClaim = await insertClaim(body)

    if (newClaim === null) {
      return c.text('Project not found', 404)
    }

    return c.json(newClaim, 201)
  },
)

app.post(
  '/api/evidences',
  zValidator('json', createEvidenceSchema, (result, c) => {
    if (!result.success) {
      return c.text('Invalid input', 400)
    }
  }),
  async (c) => {
    const body = c.req.valid('json')
    const result = await insertEvidence(body)

    if ('error' in result) {
      if (result.error === 'project_not_found') {
        return c.text('Project not found', 404)
      }
      return c.text('Source not found', 404)
    }

    return c.json(result.evidence, 201)
  },
)

app.post(
  '/api/claims/:claimId/evidences',
  // URLのclaimIdとJSONの入力を、それぞれ共有スキーマで検証する。
  zValidator('param', claimEvidenceParamsSchema, (result, c) => {
    if (!result.success) {
      return c.text('Invalid input', 400)
    }
  }),
  zValidator('json', createClaimEvidenceSchema, (result, c) => {
    if (!result.success) {
      return c.text('Invalid input', 400)
    }
  }),
  async (c) => {
    const { claimId } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await insertClaimEvidence(claimId, body)

    // Serviceの結果を、APIのステータスと固定メッセージへ変換する。
    if ('error' in result) {
      switch (result.error) {
        case 'claim_not_found':
          return c.text('Claim not found', 404)
        case 'evidence_not_found':
          return c.text('Evidence not found', 404)
        case 'project_mismatch':
          return c.text('Claim and Evidence must belong to the same Project', 400)
        case 'relation_already_exists':
          return c.text('Relation already exists', 409)
      }
    }

    return c.json(result.relation, 201)
  },
)

app.get('/health', (c) => {
  // サーバーの応答確認用。DBへの接続確認は行わない。
  return c.json({ status: 'ok' })
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
