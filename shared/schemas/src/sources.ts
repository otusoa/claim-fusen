import * as z from 'zod'

export const createSourceSchema = z.object({
  title: z.string().trim().min(1, 'titleは必須です'),
  type: z.string().nullish(),
  year: z.number().int().min(-2147483648).max(2147483647).nullish(),
})

export type CreateSourceInput = z.input<typeof createSourceSchema>
export type CreateSourceData = z.output<typeof createSourceSchema>
