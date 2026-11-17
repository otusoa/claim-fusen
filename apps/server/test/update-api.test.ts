import { beforeEach, describe, expect, it, vi } from 'vitest'
import { H3 } from 'nitro/h3'
import errorHandler from '../src/error'
import patchClaim from '~/api/claims/[claimId].patch'
import patchProject from '~/api/projects/[projectId].patch'
import patchSource from '~/api/sources/[sourceId].patch'
import patchEvidence from '~/api/evidences/[evidenceId].patch'
import patchRelation from '~/api/claims/[claimId]/evidences/[relationId].patch'
import deleteRelation from '~/api/claims/[claimId]/evidences/[relationId].delete'
import getProject from '~/api/projects/[projectId].get'
import getSource from '~/api/sources/[sourceId].get'
import getEvidence from '~/api/evidences/[evidenceId].get'

const services = vi.hoisted(() => ({
  updateClaim: vi.fn(), updateProject: vi.fn(), updateSource: vi.fn(), updateEvidence: vi.fn(),
  updateClaimEvidence: vi.fn(), deleteClaimEvidence: vi.fn(),
  findProjectById: vi.fn(), findSourceById: vi.fn(), findEvidenceById: vi.fn(),
}))
vi.mock('~/services/claims', () => services)
vi.mock('~/services/projects', () => services)
vi.mock('~/services/sources', () => services)
vi.mock('~/services/evidences', () => services)
vi.mock('~/services/claim-evidences', () => services)
const id = 'd711468b-127f-486d-9a8b-bd7dd21e8db2'
const relationId = '7bd62ce0-43b7-4e4b-a558-dc38d941e620'
const relationPath = `/api/claims/${id}/evidences/${relationId}`
const app = new H3({ onError: (error, event) => errorHandler(error, event, { defaultHandler: () => ({}) }) })
  .patch('/api/claims/:claimId', patchClaim)
  .patch('/api/projects/:projectId', patchProject)
  .patch('/api/sources/:sourceId', patchSource)
  .patch('/api/evidences/:evidenceId', patchEvidence)
  .patch('/api/claims/:claimId/evidences/:relationId', patchRelation)
  .delete('/api/claims/:claimId/evidences/:relationId', deleteRelation)
  .get('/api/projects/:projectId', getProject)
  .get('/api/sources/:sourceId', getSource)
  .get('/api/evidences/:evidenceId', getEvidence)
function request(path: string, method = 'GET') {
  return app.fetch(new Request(`http://localhost${path}`, { method }))
}
function patch(path: string, input: unknown) {
  return app.fetch(new Request(`http://localhost${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }))
}
beforeEach(() => vi.resetAllMocks())
describe('Claim update', () => {
  it('updates only provided fields without adding a status default', async () => {
    services.updateClaim.mockResolvedValue({ id, body: null, status: 'draft', updatedAt: new Date('2026-11-17T00:00:00Z') })
    const response = await patch(`/api/claims/${id}`, { body: null })
    expect(response.status).toBe(200)
    expect(services.updateClaim).toHaveBeenCalledWith(id, { body: null })
    expect(await response.json()).toMatchObject({ status: 'draft', updatedAt: '2026-11-17T00:00:00.000Z' })
  })
  it.each([{}, { title: null }, { status: null }, { title: ' ' }, { status: 'invalid' }, { body: '本文', projectId: id }, { updatedAt: '2020-01-01' }])('rejects invalid updates before calling Service', async (input) => {
    expect((await patch(`/api/claims/${id}`, input)).status).toBe(400)
    expect(services.updateClaim).not.toHaveBeenCalled()
  })
  it('rejects invalid IDs and reports missing Claims', async () => {
    expect((await patch('/api/claims/invalid', { body: '' })).status).toBe(400)
    expect(services.updateClaim).not.toHaveBeenCalled()
    services.updateClaim.mockResolvedValue(null)
    const response = await patch(`/api/claims/${id}`, { body: '' })
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Claim not found')
  })
  it('preserves body whitespace and trims title', async () => {
    services.updateClaim.mockResolvedValue({ id })
    await patch(`/api/claims/${id}`, { title: ' 主張 ', body: ' 本文\n ' })
    expect(services.updateClaim).toHaveBeenCalledWith(id, { title: '主張', body: ' 本文\n ' })
  })
  it('sanitizes internal errors', async () => {
    services.updateClaim.mockRejectedValue(new Error('secret SQL'))
    const response = await patch(`/api/claims/${id}`, { body: '' })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})

describe('Project and Source updates', () => {
  it('trims titles and preserves description whitespace and nullable fields', async () => {
    services.updateProject.mockResolvedValue({ id, title: 'Project', description: ' text\n ' })
    expect((await patch(`/api/projects/${id}`, { title: ' Project ', description: ' text\n ' })).status).toBe(200)
    expect(services.updateProject).toHaveBeenCalledWith(id, { title: 'Project', description: ' text\n ' })
    await patch(`/api/projects/${id}`, { description: null })
    expect(services.updateProject).toHaveBeenLastCalledWith(id, { description: null })
    services.updateSource.mockResolvedValue({ id })
    expect((await patch(`/api/sources/${id}`, { title: ' Source ', type: null, year: null, url: null })).status).toBe(200)
    expect(services.updateSource).toHaveBeenCalledWith(id, { title: 'Source', type: null, year: null, url: null })
    await patch(`/api/sources/${id}`, { url: 'https://example.com/paper', year: 0 })
    expect(services.updateSource).toHaveBeenLastCalledWith(id, { url: 'https://example.com/paper', year: 0 })
  })
  it.each([
    ['projects', {}], ['projects', { title: ' ' }], ['projects', { title: null }],
    ['projects', { id }], ['projects', { createdAt: '2020-01-01' }],
    ['sources', {}], ['sources', { title: null }], ['sources', { title: ' ' }],
    ['sources', { url: 'javascript:alert(1)' }], ['sources', { url: '/relative' }],
    ['sources', { url: 'ftp://example.com' }], ['sources', { year: '2026' }],
    ['sources', { year: 1.5 }], ['sources', { year: 2147483648 }],
    ['sources', { metadata: {} }], ['sources', { projectId: id }],
  ])('rejects invalid %s payload %j', async (kind, input) => {
    expect((await patch(`/api/${kind}/${id}`, input)).status).toBe(400)
    expect(services.updateProject).not.toHaveBeenCalled()
    expect(services.updateSource).not.toHaveBeenCalled()
  })
  it.each([
    ['projects', services.updateProject, 'Project not found'],
    ['sources', services.updateSource, 'Source not found'],
  ])('handles invalid IDs, missing %s and internal errors', async (kind, service, message) => {
    expect((await patch(`/api/${kind}/invalid`, { title: 'Title' })).status).toBe(400)
    expect(service).not.toHaveBeenCalled()
    service.mockResolvedValue(null)
    const missing = await patch(`/api/${kind}/${id}`, { title: 'Title' })
    expect(missing.status).toBe(404)
    expect(await missing.text()).toBe(message)
    service.mockRejectedValue(new Error('secret SQL'))
    const error = await patch(`/api/${kind}/${id}`, { title: 'Title' })
    expect(error.status).toBe(500)
    expect(await error.json()).toEqual({ error: 'Internal Server Error' })
  })
})

describe('Evidence updates', () => {
  it('passes only supplied fields to the merged-content validation in Service', async () => {
    services.updateEvidence.mockResolvedValue({ evidence: { id, sourceId: id, summary: null } })
    expect((await patch(`/api/evidences/${id}`, { sourceId: id, summary: null, quote: ' quote\n ', note: null })).status).toBe(200)
    expect(services.updateEvidence).toHaveBeenCalledWith(id, { sourceId: id, summary: null, quote: ' quote\n ', note: null })
    await patch(`/api/evidences/${id}`, { locator: '' })
    expect(services.updateEvidence).toHaveBeenLastCalledWith(id, { locator: '' })
  })
  it.each([{}, { sourceId: null }, { sourceId: 'invalid' }, { projectId: id }, { updatedAt: 'now' }, { quote: 5 }])('rejects invalid updates %j', async (input) => {
    expect((await patch(`/api/evidences/${id}`, input)).status).toBe(400)
    expect(services.updateEvidence).not.toHaveBeenCalled()
  })
  it.each([
    ['invalid_input', 400, 'Invalid input'],
    ['evidence_not_found', 404, 'Evidence not found'],
    ['source_not_found', 404, 'Source not found'],
  ])('maps %s without exposing Service details', async (error, status, message) => {
    services.updateEvidence.mockResolvedValue({ error })
    const response = await patch(`/api/evidences/${id}`, { summary: null })
    expect(response.status).toBe(status)
    expect(await response.text()).toBe(message)
  })
  it('rejects invalid ID and sanitizes internal errors', async () => {
    expect((await patch('/api/evidences/invalid', { note: null })).status).toBe(400)
    expect(services.updateEvidence).not.toHaveBeenCalled()
    services.updateEvidence.mockRejectedValue(new Error('secret SQL'))
    const response = await patch(`/api/evidences/${id}`, { note: null })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})

describe('Relation update and removal', () => {
  it.each(['supports', 'challenges', 'contextualizes', 'corresponds'])('accepts relation type %s', async (type) => {
    services.updateClaimEvidence.mockResolvedValue({ relation: { id: relationId, claimId: id, type, note: null } })
    const response = await patch(relationPath, { type, note: null })
    expect(response.status).toBe(200)
    expect(services.updateClaimEvidence).toHaveBeenCalledWith(id, relationId, { type, note: null })
    expect(await response.json()).toMatchObject({ type, note: null })
  })
  it('allows note-only changes without adding a type', async () => {
    services.updateClaimEvidence.mockResolvedValue({ relation: { id: relationId } })
    await patch(relationPath, { note: ' note\n ' })
    expect(services.updateClaimEvidence).toHaveBeenCalledWith(id, relationId, { note: ' note\n ' })
  })
  it.each([{}, { type: null }, { type: 'invalid' }, { evidenceId: id }, { claimId: id }, { createdAt: 'now' }])('rejects invalid updates %j', async (input) => {
    expect((await patch(relationPath, input)).status).toBe(400)
    expect(services.updateClaimEvidence).not.toHaveBeenCalled()
  })
  it.each([
    ['claim_not_found', 404, 'Claim not found'],
    ['relation_not_found', 404, 'Relation not found'],
    ['relation_already_exists', 409, 'Relation already exists'],
  ])('maps update error %s', async (error, status, message) => {
    services.updateClaimEvidence.mockResolvedValue({ error })
    const response = await patch(relationPath, { type: 'supports' })
    expect(response.status).toBe(status)
    expect(await response.text()).toBe(message)
  })
  it('returns an empty 204, then 404 on repeated removal', async () => {
    services.deleteClaimEvidence.mockResolvedValueOnce({ deleted: true }).mockResolvedValueOnce({ error: 'relation_not_found' })
    const response = await request(relationPath, 'DELETE')
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(services.deleteClaimEvidence).toHaveBeenCalledWith(id, relationId)
    const repeated = await request(relationPath, 'DELETE')
    expect(repeated.status).toBe(404)
    expect(await repeated.text()).toBe('Relation not found')
  })
  it('returns 404 when the parent Claim is missing on removal', async () => {
    services.deleteClaimEvidence.mockResolvedValue({ error: 'claim_not_found' })
    const response = await request(relationPath, 'DELETE')
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Claim not found')
  })
  it.each(['PATCH', 'DELETE'])('validates both path IDs for %s and sanitizes errors', async (method) => {
    const send = (path: string) => method === 'PATCH' ? patch(path, { note: null }) : request(path, method)
    expect((await send(`/api/claims/invalid/evidences/${relationId}`)).status).toBe(400)
    expect((await send(`/api/claims/${id}/evidences/invalid`)).status).toBe(400)
    expect(services.updateClaimEvidence).not.toHaveBeenCalled()
    expect(services.deleteClaimEvidence).not.toHaveBeenCalled()
    const service = method === 'PATCH' ? services.updateClaimEvidence : services.deleteClaimEvidence
    service.mockRejectedValue(new Error('secret SQL'))
    const response = await send(relationPath)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})

describe('Single-resource detail', () => {
  it.each([
    ['projects', services.findProjectById, 'Project not found'],
    ['sources', services.findSourceById, 'Source not found'],
    ['evidences', services.findEvidenceById, 'Evidence not found'],
  ])('gets %s and handles invalid ID, missing row and internal error', async (kind, service, message) => {
    const row = { id, createdAt: new Date('2026-11-17T00:00:00Z'), ...(kind === 'evidences' ? { source: { id, title: 'Source' } } : {}) }
    service.mockResolvedValue(row)
    const response = await request(`/api/${kind}/${id}`)
    expect(response.status).toBe(200)
    expect(service).toHaveBeenCalledWith(id)
    expect(await response.json()).toEqual({ ...row, createdAt: '2026-11-17T00:00:00.000Z' })
    service.mockClear()
    expect((await request(`/api/${kind}/invalid`)).status).toBe(400)
    expect(service).not.toHaveBeenCalled()
    service.mockResolvedValue(null)
    const missing = await request(`/api/${kind}/${id}`)
    expect(missing.status).toBe(404)
    expect(await missing.text()).toBe(message)
    service.mockRejectedValue(new Error('secret SQL'))
    const error = await request(`/api/${kind}/${id}`)
    expect(error.status).toBe(500)
    expect(await error.json()).toEqual({ error: 'Internal Server Error' })
  })
})

describe('PATCH request format', () => {
  it.each(['claims', 'projects', 'sources', 'evidences'])('rejects malformed JSON and wrong content type for %s', async (kind) => {
    for (const [contentType, body] of [['application/json', '{'], ['text/plain', '{"title":"Title"}']]) {
      const response = await app.fetch(new Request(`http://localhost/api/${kind}/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': contentType! }, body,
      }))
      expect(response.status).toBe(400)
      expect(await response.text()).toBe('Invalid input')
    }
  })
})
