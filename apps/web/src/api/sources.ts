import { createSourceSchema, type CreateSourceInput } from '@kari-fusen/schemas'
import { postJson, requestJson } from './http'

export interface Source {
  id: string
  title: string
  type: string | null
  year: number | null
  url: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export function listSources(signal?: AbortSignal): Promise<Source[]> {
  return requestJson('/api/sources', { signal })
}

export function createSource(input: CreateSourceInput): Promise<Source> {
  return postJson('/api/sources', createSourceSchema.parse(input))
}
