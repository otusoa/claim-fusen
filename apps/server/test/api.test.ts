import { beforeEach, describe, expect, it, vi } from 'vitest'
import { H3 } from 'nitro/h3'
import errorHandler from '../src/error.js'
import health from '~~/src/routes/health.get'
import getProjects from '../src/api/projects.get.js'
import postProject from '../src/api/projects.post.js'
import postSource from '../src/api/sources.post.js'
import postClaim from '../src/api/claims.post.js'
import postEvidence from '../src/api/evidences.post.js'
import postClaimEvidence from '../src/api/claims/[claimId]/evidences.post.js'

const services = vi.hoisted(() => ({
  listProjects: vi.fn(),
  insertProject: vi.fn(),
  insertSource: vi.fn(),
  insertClaim: vi.fn(),
  insertEvidence: vi.fn(),
  insertClaimEvidence: vi.fn(),
}))

vi.mock('../src/services/projects.js', () => ({
  listProjects: services.listProjects,
  insertProject: services.insertProject,
}))
vi.mock('../src/services/sources.js', () => ({ insertSource: services.insertSource }))
vi.mock('../src/services/claims.js', () => ({ insertClaim: services.insertClaim }))
vi.mock('../src/services/evidences.js', () => ({ insertEvidence: services.insertEvidence }))
vi.mock('../src/services/claim-evidences.js', () => ({ insertClaimEvidence: services.insertClaimEvidence }))

const projectId = 'd711468b-127f-486d-9a8b-bd7dd21e8db2'
const sourceId = 'e176856c-1673-4ec2-b22a-b01f14717c4e'
const claimId = 'dad2f364-a872-494c-bbfc-e2aa68c7e39d'
const evidenceId = 'bbaa2457-9e90-4e56-9fd6-8acfd5b6b210'
const relationPath = `/api/claims/${claimId}/evidences`

const app = new H3({
  onError: (error, event) => errorHandler(error, event, { defaultHandler: () => ({}) }),
})
  .get('/health', health)
  .get('/api/projects', getProjects)
  .post('/api/projects', postProject)
  .post('/api/sources', postSource)
  .post('/api/claims', postClaim)
  .post('/api/evidences', postEvidence)
  .post('/api/claims/:claimId/evidences', postClaimEvidence)

function post(path: string, body: unknown) {
  return app.fetch(new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

beforeEach(() => vi.resetAllMocks())

describe('Nitro HTTP API contract', () => {
  it('returns health without calling a database service', async () => {
    const response = await app.fetch(new Request('http://localhost/health'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
    for (const service of Object.values(services)) expect(service).not.toHaveBeenCalled()
  })

  it('serializes the project list, including database dates', async () => {
    services.listProjects.mockResolvedValue([{ id: projectId, createdAt: new Date('2026-10-01T00:00:00Z') }])
    const response = await app.fetch(new Request('http://localhost/api/projects'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ id: projectId, createdAt: '2026-10-01T00:00:00.000Z' }])
  })

  it('creates a project with a trimmed title and nullable description', async () => {
    const project = { id: projectId, title: '研究', description: null }
    services.insertProject.mockResolvedValue(project)
    const response = await post('/api/projects', { title: '  研究  ', description: null })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(project)
    expect(services.insertProject).toHaveBeenCalledWith('研究', null)
  })

  it('creates a source using the shared schema', async () => {
    const source = { id: sourceId, title: '本教大意', type: null, year: 1888 }
    services.insertSource.mockResolvedValue(source)
    const response = await post('/api/sources', { title: ' 本教大意 ', type: null, year: 1888 })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(source)
    expect(services.insertSource).toHaveBeenCalledWith('本教大意', null, 1888)
  })

  it('creates a claim with the default active status', async () => {
    services.insertClaim.mockResolvedValue({ id: claimId, projectId, title: '主張', status: 'active' })
    const response = await post('/api/claims', { projectId, title: ' 主張 ' })
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ id: claimId, status: 'active' })
    expect(services.insertClaim).toHaveBeenCalledWith({ projectId, title: '主張', status: 'active' })
  })

  it('keeps the evidence quote separate from the summary without trimming it', async () => {
    const input = { projectId, sourceId, quote: '  役仕勧業怠る時なく  ', summary: '要約', locator: '3頁', note: null }
    const evidence = { id: evidenceId, ...input }
    services.insertEvidence.mockResolvedValue({ evidence })
    const response = await post('/api/evidences', input)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(evidence)
    expect(services.insertEvidence).toHaveBeenCalledWith(input)
  })

  it.each(['supports', 'challenges', 'contextualizes', 'corresponds'])('creates a %s relation from the URL claim ID', async (type) => {
    const input = { evidenceId, type, note: null }
    const relation = { id: 'relation-id', claimId, ...input }
    services.insertClaimEvidence.mockResolvedValue({ relation })
    const response = await post(relationPath, input)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(relation)
    expect(services.insertClaimEvidence).toHaveBeenCalledWith(claimId, input)
  })

  it.each([
    ['/api/projects', { title: '   ' }],
    ['/api/sources', { title: '史料', year: 1.5 }],
    ['/api/claims', { projectId: 'not-a-uuid', title: '主張' }],
    ['/api/claims', { projectId, title: '主張', status: 'invalid' }],
    ['/api/evidences', { projectId, sourceId: 'not-a-uuid' }],
    [relationPath, { evidenceId, type: 'related' }],
    ['/api/claims/not-a-uuid/evidences', { evidenceId, type: 'supports' }],
  ])('rejects invalid input at %s before calling a service', async (path, input) => {
    const response = await post(path, input)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Invalid input')
    for (const service of Object.values(services)) expect(service).not.toHaveBeenCalled()
  })

  it.each([
    ['application/json', '{'],
    ['application/json', ''],
    ['text/plain', '{"title":"研究"}'],
  ])('rejects malformed or non-JSON requests (%s)', async (contentType, body) => {
    const response = await app.fetch(new Request('http://localhost/api/projects', {
      method: 'POST', headers: { 'Content-Type': contentType }, body,
    }))
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Invalid input')
    expect(services.insertProject).not.toHaveBeenCalled()
  })

  it('reports a missing project when creating a claim', async () => {
    services.insertClaim.mockResolvedValue(null)
    const response = await post('/api/claims', { projectId, title: '主張' })
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Project not found')
  })

  it.each([
    ['project_not_found', 'Project not found'],
    ['source_not_found', 'Source not found'],
  ])('reports %s when creating evidence', async (error, message) => {
    services.insertEvidence.mockResolvedValue({ error })
    const response = await post('/api/evidences', { projectId, sourceId })
    expect(response.status).toBe(404)
    expect(await response.text()).toBe(message)
  })

  it.each([
    ['claim_not_found', 404, 'Claim not found'],
    ['evidence_not_found', 404, 'Evidence not found'],
    ['project_mismatch', 400, 'Claim and Evidence must belong to the same Project'],
    ['relation_already_exists', 409, 'Relation already exists'],
  ])('reports %s when creating a relation', async (error, status, message) => {
    services.insertClaimEvidence.mockResolvedValue({ error })
    const response = await post(relationPath, { evidenceId, type: 'supports' })
    expect(response.status).toBe(status)
    expect(await response.text()).toBe(message)
  })

  it.each(['application/json', 'text/html'])('hides internal database errors for Accept: %s', async (accept) => {
    services.listProjects.mockRejectedValue(new Error('secret SQL and database connection string'))
    const response = await app.fetch(new Request('http://localhost/api/projects', { headers: { Accept: accept } }))
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})
