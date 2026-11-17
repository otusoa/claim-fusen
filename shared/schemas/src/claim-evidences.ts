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

export const claimEvidenceRelationParamsSchema = claimParamsSchema.extend({ relationId: z.uuid() })
export const updateClaimEvidenceSchema = createClaimEvidenceSchema.omit({ evidenceId: true }).partial().strict().refine(
  (input) => Object.values(input).some((value) => value !== undefined),
  { message: '更新する項目を1つ以上指定してください' },
)
export type UpdateClaimEvidenceInput = z.input<typeof updateClaimEvidenceSchema>
export type UpdateClaimEvidenceData = z.output<typeof updateClaimEvidenceSchema>

export type CreateClaimEvidenceInput =
  z.input<typeof createClaimEvidenceSchema>
export type CreateClaimEvidenceData =
  z.output<typeof createClaimEvidenceSchema>
