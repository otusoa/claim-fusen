import * as z from 'zod'

export const claimStatuses = ['draft', 'active', 'archived'] as const
export type ClaimStatus = (typeof claimStatuses)[number]

export const claimParamsSchema = z.object({
  claimId: z.uuid(),
})

export const createClaimSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1, 'titleは必須です'),
  body: z.string().nullish(),
  status: z.enum(claimStatuses).default('active'),
})

export type CreateClaimInput = z.input<typeof createClaimSchema>
export type CreateClaimData = z.output<typeof createClaimSchema>
