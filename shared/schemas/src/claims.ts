import * as z from 'zod'

export const claimStatuses = ['draft', 'active', 'archived'] as const
export type ClaimStatus = (typeof claimStatuses)[number]

export const claimParamsSchema = z.object({
  claimId: z.uuid(),
})

export const listClaimsQuerySchema = z.object({
  projectId: z.uuid(),
})

export const createClaimSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1, 'titleは必須です'),
  body: z.string().nullish(),
  status: z.enum(claimStatuses).default('active'),
})

export const updateClaimSchema = z.object({
  title: z.string().trim().min(1, 'titleは必須です').optional(),
  body: z.string().nullish(),
  status: z.enum(claimStatuses).optional(),
}).strict().refine(
  (input) => Object.values(input).some((v) => v !== undefined),
  { message: '更新する項目を1つ以上指定してください' },
)

export type CreateClaimInput = z.input<typeof createClaimSchema>
export type CreateClaimData = z.output<typeof createClaimSchema>
export type UpdateClaimInput = z.input<typeof updateClaimSchema>
export type UpdateClaimData = z.output<typeof updateClaimSchema>
