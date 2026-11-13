import type { ClaimEvidenceType, ClaimStatus } from '@kari-fusen/schemas'
import { createClaimSchema, type CreateClaimInput } from '@kari-fusen/schemas'
import { postJson } from './http'
import type { Source } from './sources'
import type { EvidenceWithSource } from './evidences'

export interface Claim {
  id: string
  projectId: string
  title: string
  body: string | null
  status: ClaimStatus
  createdAt: string
  updatedAt: string
}

export type ClaimSource = Source

export interface ClaimEvidence {
  id: string
  claimId: string
  evidenceId: string
  type: ClaimEvidenceType
  note: string | null
  createdAt: string
  evidence: EvidenceWithSource
}

export interface ClaimDetail extends Claim {
  claimEvidences: ClaimEvidence[]
}

export class ClaimsRequestError extends Error {
  constructor(readonly status: number, message = 'Claim一覧を取得できませんでした') {
    super(message)
  }
}

export async function listClaims(projectId: string, signal?: AbortSignal): Promise<Claim[]> {
  const query = new URLSearchParams({ projectId })
  const response = await fetch(`/api/claims?${query}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new ClaimsRequestError(response.status)
  return response.json()
}

export async function getClaim(claimId: string, signal?: AbortSignal): Promise<ClaimDetail> {
  const response = await fetch(`/api/claims/${encodeURIComponent(claimId)}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new ClaimsRequestError(response.status, 'Claim詳細を取得できませんでした')
  return response.json()
}

export function createClaim(input: CreateClaimInput): Promise<Claim> {
  const data = createClaimSchema.parse(input)
  return postJson('/api/claims', { ...data, body: data.body === '' ? null : data.body ?? null })
}
