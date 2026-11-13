import * as z from 'zod'
import { projectParamsSchema } from './projects.js'

export const listEvidencesQuerySchema = projectParamsSchema

export const createEvidenceSchema = z.object({
  projectId: z.uuid(),
  sourceId: z.uuid(),
  quote: z.string().nullish(),
  summary: z.string().nullish(),
  locator: z.string().nullish(),
  note: z.string().nullish(),
}).refine((input) => !!(input.quote?.trim() || input.summary?.trim()), {
  path: ['summary'], message: '引用または要約のどちらかを入力してください',
})

export type CreateEvidenceInput = z.input<typeof createEvidenceSchema>
export type CreateEvidenceData = z.output<typeof createEvidenceSchema>
