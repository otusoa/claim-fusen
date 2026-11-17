import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { db, pool } from '~/pool.js'
import { projects, sources, claims, evidences, claimEvidences } from '~/db/schema/index.js'
import { updateProject, findProjectById } from '~/services/projects'
import { updateSource, findSourceById } from '~/services/sources'
import { updateClaim } from '~/services/claims'
import { updateEvidence, findEvidenceById } from '~/services/evidences'
import { updateClaimEvidence, deleteClaimEvidence } from '~/services/claim-evidences'

// 通常のDATABASE_URLは参照しない。専用DBがない環境では接続せずskipする。
vi.mock('~/pool.js', async () => {
  const url = process.env.TEST_DATABASE_URL
  if (!url) return { db: undefined, pool: undefined }
  const { Pool } = await import('pg')
  const { createDb } = await import('~/db/index.js')
  const pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 3000 })
  return { pool, db: createDb(pool) }
})

describe.skipIf(!process.env.TEST_DATABASE_URL)('PostgreSQL updates (dedicated TEST_DATABASE_URL)', () => {
  const oldDate = new Date('2020-01-01T00:00:00Z')
  let projectId: string
  let otherProjectId: string
  let sourceId: string
  let otherSourceId: string
  let claimId: string
  let otherClaimId: string
  let evidenceId: string
  let relationId: string
  let duplicateId: string

  beforeEach(async () => {
    projectId = randomUUID()
    otherProjectId = randomUUID()
    sourceId = randomUUID()
    otherSourceId = randomUUID()
    claimId = randomUUID()
    otherClaimId = randomUUID()
    evidenceId = randomUUID()
    relationId = randomUUID()
    duplicateId = randomUUID()
    // migration済みの専用DBを前提とする。既存テーブルの全削除や再作成はしない。
    await db.insert(projects).values([projectId, otherProjectId].map((id) => ({
      id, title: 'integration fixture', description: 'description', createdAt: oldDate, updatedAt: oldDate,
    })))
    await db.insert(sources).values([sourceId, otherSourceId].map((id) => ({
      id, title: 'source', type: 'paper', year: 2026, url: 'https://example.com', metadata: { keep: true },
      createdAt: oldDate, updatedAt: oldDate,
    })))
    await db.insert(claims).values([
      { id: claimId, projectId, title: 'claim', body: 'body', status: 'draft', createdAt: oldDate, updatedAt: oldDate },
      { id: otherClaimId, projectId: otherProjectId, title: 'other claim' },
    ])
    await db.insert(evidences).values({
      id: evidenceId, projectId, sourceId, quote: ' quote\n ', summary: ' summary\n ', locator: 'p.1', note: 'note',
      createdAt: oldDate, updatedAt: oldDate,
    })
    await db.insert(claimEvidences).values([
      { id: relationId, claimId, evidenceId, type: 'supports', note: 'note', createdAt: oldDate },
      { id: duplicateId, claimId, evidenceId, type: 'challenges' },
    ])
  })
  afterEach(async () => {
    // このテストが作成したUUIDだけを削除する。Projectのcascadeで子も除去する。
    await db.delete(projects).where(inArray(projects.id, [projectId, otherProjectId]))
    await db.delete(sources).where(inArray(sources.id, [sourceId, otherSourceId]))
  })
  afterAll(async () => { await pool.end() })

  it('updates supplied Claim fields, keeps omitted status/project/createdAt, and advances updatedAt', async () => {
    const result = await updateClaim(claimId, { title: 'new title', body: null })
    expect(result).toMatchObject({ id: claimId, projectId, title: 'new title', body: null, status: 'draft', createdAt: oldDate })
    expect(result!.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime())
    expect(await updateClaim(randomUUID(), { status: 'active' })).toBeNull()
  })
  it('updates Project and shared Source without changing omitted fields or metadata', async () => {
    const project = await updateProject(projectId, { description: null })
    expect(project).toMatchObject({ title: 'integration fixture', description: null, createdAt: oldDate })
    expect(project!.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime())
    const source = await updateSource(sourceId, { type: null, year: null, url: null })
    expect(source).toMatchObject({ title: 'source', type: null, year: null, url: null, metadata: { keep: true }, createdAt: oldDate })
    expect(source!.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime())
    expect(await findProjectById(projectId)).toEqual(project)
    expect(await findSourceById(sourceId)).toEqual(source)
    expect((await findEvidenceById(evidenceId))!.source).toEqual(source)
    expect(await updateProject(randomUUID(), { description: null })).toBeNull()
    expect(await updateSource(randomUUID(), { year: null })).toBeNull()
  })
  it('validates merged Evidence, preserves whitespace, and changes Source without moving Project', async () => {
    const result = await updateEvidence(evidenceId, { sourceId: otherSourceId, summary: null, locator: null, note: ' note\n ' })
    expect(result).toMatchObject({ evidence: {
      id: evidenceId, projectId, sourceId: otherSourceId, quote: ' quote\n ', summary: null,
      locator: null, note: ' note\n ', createdAt: oldDate,
    } })
    if (!result.evidence) throw new Error('expected updated Evidence')
    expect(result.evidence.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime())
    expect(await updateEvidence(evidenceId, { quote: ' \n ' })).toEqual({ error: 'invalid_input' })
    expect(await updateEvidence(evidenceId, { sourceId: randomUUID() })).toEqual({ error: 'source_not_found' })
    expect(await db.query.evidences.findFirst({ where: eq(evidences.id, evidenceId) })).toEqual(result.evidence)
    expect((await findEvidenceById(evidenceId))!.source.id).toBe(otherSourceId)
    expect(await updateEvidence(randomUUID(), { note: null })).toEqual({ error: 'evidence_not_found' })
  })
  it('requires legacy empty Evidence to be repaired before accepting note-only edits', async () => {
    await db.update(evidences).set({ quote: null, summary: ' \n ' }).where(eq(evidences.id, evidenceId))
    expect(await updateEvidence(evidenceId, { note: null })).toEqual({ error: 'invalid_input' })
    const result = await updateEvidence(evidenceId, { summary: ' repaired\n ' })
    expect(result).toMatchObject({ evidence: { summary: ' repaired\n ', quote: null, note: 'note' } })
  })
  it('serializes concurrent clears so at least one of quote/summary remains', async () => {
    const results = await Promise.all([
      updateEvidence(evidenceId, { quote: null }),
      updateEvidence(evidenceId, { summary: null }),
    ])
    expect(results.filter((result) => 'evidence' in result)).toHaveLength(1)
    expect(results.filter((result) => 'error' in result)).toEqual([{ error: 'invalid_input' }])
    const row = await findEvidenceById(evidenceId)
    expect(Boolean(row!.quote?.trim() || row!.summary?.trim())).toBe(true)
  })
  it('updates relation type/note, handles the exact unique constraint, and rolls back conflicts', async () => {
    expect(await updateClaimEvidence(claimId, relationId, { type: 'challenges', note: null }))
      .toEqual({ error: 'relation_already_exists' })
    const unchanged = await db.query.claimEvidences.findFirst({ where: eq(claimEvidences.id, relationId) })
    expect(unchanged).toMatchObject({ type: 'supports', note: 'note' })
    const result = await updateClaimEvidence(claimId, relationId, { type: 'contextualizes', note: null })
    expect(result).toMatchObject({ relation: { claimId, evidenceId, type: 'contextualizes', note: null, createdAt: oldDate } })
    expect(await updateClaimEvidence(claimId, relationId, { type: 'contextualizes' })).toMatchObject({ relation: { id: relationId } })
  })
  it('scopes both update and removal by Claim, leaving the relation and entities intact on wrong Claim', async () => {
    expect(await updateClaimEvidence(otherClaimId, relationId, { note: null })).toEqual({ error: 'relation_not_found' })
    expect(await deleteClaimEvidence(otherClaimId, relationId)).toEqual({ error: 'relation_not_found' })
    expect(await updateClaimEvidence(randomUUID(), relationId, { note: null })).toEqual({ error: 'claim_not_found' })
    expect(await deleteClaimEvidence(randomUUID(), relationId)).toEqual({ error: 'claim_not_found' })
    expect(await deleteClaimEvidence(claimId, relationId)).toEqual({ deleted: true })
    expect(await deleteClaimEvidence(claimId, relationId)).toEqual({ error: 'relation_not_found' })
    expect(await db.query.claims.findFirst({ where: eq(claims.id, claimId) })).toBeDefined()
    expect(await findEvidenceById(evidenceId)).not.toBeNull()
    expect(await db.query.claimEvidences.findFirst({ where: eq(claimEvidences.id, duplicateId) })).toBeDefined()
  })
  it('returns null for missing details', async () => {
    expect(await findProjectById(randomUUID())).toBeNull()
    expect(await findSourceById(randomUUID())).toBeNull()
    expect(await findEvidenceById(randomUUID())).toBeNull()
  })
})
