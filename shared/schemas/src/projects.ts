import * as z from 'zod'

export const projectParamsSchema = z.object({ projectId: z.uuid() })

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, 'titleは必須です'),
  description: z.string().nullish(),
})

export type CreateProjectInput = z.input<typeof createProjectSchema>
export type CreateProjectData = z.output<typeof createProjectSchema>

export const updateProjectSchema = createProjectSchema.partial().strict().refine(
  (input) => Object.values(input).some((value) => value !== undefined),
  { message: '更新する項目を1つ以上指定してください' },
)
export type UpdateProjectInput = z.input<typeof updateProjectSchema>
export type UpdateProjectData = z.output<typeof updateProjectSchema>
