import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateEvidence } from '~/services/evidences'
import { updateClaimEvidence } from '~/services/claim-evidences'

const database = vi.hoisted(() => ({ transaction: vi.fn() }))
vi.mock('~/pool.js', () => ({ db: database }))

const id = 'd711468b-127f-486d-9a8b-bd7dd21e8db2'
const row = { id, projectId: id, sourceId: id, quote: ' quote\n ', summary: null, locator: 'p.1', note: 'note' }
const selectLock = vi.fn()
const write = vi.fn()
const tx = {
  select: () => ({ from: () => ({ where: () => ({ for: selectLock }) }) }),
  update: () => ({ set: write }),
}
beforeEach(() => {
  vi.resetAllMocks()
  database.transaction.mockImplementation((run) => run(tx))
  selectLock.mockResolvedValue([row])
  write.mockImplementation((patch) => ({ where: () => ({ returning: async () => [{ ...row, ...patch }] }) }))
})

describe('Evidence merged-content validation (DB operations mocked)', () => {
  it('allows clearing summary because the stored quote remains, preserving supplied whitespace', async () => {
    expect(await updateEvidence(id, { summary: null, note: ' note\n ' })).toMatchObject({
      evidence: { quote: ' quote\n ', summary: null, note: ' note\n ', locator: 'p.1' },
    })
    expect(write).toHaveBeenCalledWith({ summary: null, note: ' note\n ', updatedAt: expect.any(Date) })
  })
  it('does not overwrite an existing quote with undefined during merge validation', async () => {
    expect(await updateEvidence(id, { quote: undefined, note: null })).toHaveProperty('evidence')
  })
  it.each([{ quote: null }, { quote: ' \n ' }, { quote: '', summary: null }])('rejects clearing all content %j without a write', async (input) => {
    expect(await updateEvidence(id, input)).toEqual({ error: 'invalid_input' })
    expect(write).not.toHaveBeenCalled()
  })
  it('allows replacing a quote with a summary in the same update', async () => {
    expect(await updateEvidence(id, { quote: null, summary: ' summary\n ' })).toMatchObject({
      evidence: { quote: null, summary: ' summary\n ' },
    })
  })
  it('requires legacy empty rows to gain content before metadata-only changes', async () => {
    selectLock.mockResolvedValue([{ ...row, quote: null }])
    expect(await updateEvidence(id, { note: null })).toEqual({ error: 'invalid_input' })
    expect(write).not.toHaveBeenCalled()
    expect(await updateEvidence(id, { quote: ' repaired ' })).toHaveProperty('evidence')
  })
  it('reports missing Evidence and missing Source separately, without writing', async () => {
    selectLock.mockResolvedValueOnce([])
    expect(await updateEvidence(id, { note: null })).toEqual({ error: 'evidence_not_found' })
    selectLock.mockResolvedValueOnce([row]).mockResolvedValueOnce([])
    expect(await updateEvidence(id, { sourceId: id })).toEqual({ error: 'source_not_found' })
    expect(write).not.toHaveBeenCalled()
  })
})

describe('Relation conflict detection (transaction mocked)', () => {
  const constraint = 'claim_evidences_claim_id_evidence_id_type_unique'
  it('recognizes the specific PostgreSQL constraint through the Drizzle cause chain', async () => {
    database.transaction.mockRejectedValue({ cause: { code: '23505', constraint } })
    expect(await updateClaimEvidence(id, id, { type: 'challenges' })).toEqual({ error: 'relation_already_exists' })
  })
  it.each([
    { code: '23505', constraint: 'other_unique_constraint' },
    { code: '23503', constraint },
    new Error('connection failed'),
  ])('does not turn unrelated database errors into a conflict', async (error) => {
    database.transaction.mockRejectedValue(error)
    await expect(updateClaimEvidence(id, id, { note: null })).rejects.toBe(error)
  })
  it('terminates on cyclic error causes and propagates the original error', async () => {
    const error: { cause?: unknown } = {}
    error.cause = error
    database.transaction.mockRejectedValue(error)
    await expect(updateClaimEvidence(id, id, { note: null })).rejects.toBe(error)
  })
})
