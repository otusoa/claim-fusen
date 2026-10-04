import * as z from 'zod'

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, 'titleは必須です'),
  description: z.string().nullish(),
})

export type CreateProjectInput = z.input<typeof createProjectSchema>
export type CreateProjectData = z.output<typeof createProjectSchema>
