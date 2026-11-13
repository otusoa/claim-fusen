import { createEvidenceSchema, type CreateEvidenceInput } from '@kari-fusen/schemas'
import type { Source } from './sources'
import { postJson, requestJson } from './http'

export interface Evidence {
  id: string
  projectId: string
  sourceId: string
  quote: string | null
  summary: string | null
  locator: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface EvidenceWithSource extends Evidence { source: Source }

export function listEvidences(projectId: string, signal?: AbortSignal): Promise<EvidenceWithSource[]> {
  return requestJson(`/api/evidences?${new URLSearchParams({ projectId })}`, { signal })
}

export function createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
  const data = createEvidenceSchema.parse(input)
  return postJson('/api/evidences', {
    ...data,
    quote: data.quote === '' ? null : data.quote ?? null,
    summary: data.summary === '' ? null : data.summary ?? null,
    locator: data.locator === '' ? null : data.locator ?? null,
    note: data.note === '' ? null : data.note ?? null,
  })
}
