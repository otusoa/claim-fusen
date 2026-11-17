import * as z from 'zod'

export const createSourceSchema = z.object({
  title: z.string().trim().min(1, 'titleは必須です'),
  type: z.string().nullish(),
  year: z.number().int().min(-2147483648).max(2147483647).nullish(),
  url: z.url({ protocol: /^https?$/ }).trim().nullish(),
})

export type CreateSourceInput = z.input<typeof createSourceSchema>
export type CreateSourceData = z.output<typeof createSourceSchema>

export const sourceParamsSchema = z.object({ sourceId: z.uuid() })
export const updateSourceSchema = createSourceSchema.partial().strict().refine(
  (input) => Object.values(input).some((value) => value !== undefined),
  { message: '更新する項目を1つ以上指定してください' },
)
export type UpdateSourceInput = z.input<typeof updateSourceSchema>
export type UpdateSourceData = z.output<typeof updateSourceSchema>
