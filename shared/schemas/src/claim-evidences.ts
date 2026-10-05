import * as z from 'zod'
import { claimParamsSchema } from './claims.js'

export const claimEvidenceTypes = [
  'supports',
  'challenges',
  'contextualizes',
  'corresponds',
] as const

export type ClaimEvidenceType = (typeof claimEvidenceTypes)[number]

export const createClaimEvidenceSchema = z.object({
  evidenceId: z.uuid(),
  type: z.enum(claimEvidenceTypes),
  note: z.string().nullish(),
})

export const claimEvidenceParamsSchema = claimParamsSchema

export type CreateClaimEvidenceInput =
  z.input<typeof createClaimEvidenceSchema>
export type CreateClaimEvidenceData =
  z.output<typeof createClaimEvidenceSchema>
