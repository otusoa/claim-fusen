import type { ClaimEvidenceType, ClaimStatus } from '@kari-fusen/schemas'

export interface Claim {
  id: string
  projectId: string
  title: string
  body: string | null
  status: ClaimStatus
  createdAt: string
  updatedAt: string
}

export interface ClaimSource {
  id: string
  title: string
  type: string | null
  year: number | null
  url: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface ClaimEvidence {
  id: string
  claimId: string
  evidenceId: string
  type: ClaimEvidenceType
  note: string | null
  createdAt: string
  evidence: {
    id: string
    projectId: string
    sourceId: string
    quote: string | null
    summary: string | null
    locator: string | null
    note: string | null
    createdAt: string
    updatedAt: string
    source: ClaimSource
  }
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
