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

export const evidenceParamsSchema = z.object({ evidenceId: z.uuid() })
// 内容の必須判定は、Serviceで既存値と合わせてから行う。
export const updateEvidenceSchema = z.object({
  sourceId: z.uuid().optional(),
  quote: z.string().nullish(),
  summary: z.string().nullish(),
  locator: z.string().nullish(),
  note: z.string().nullish(),
}).strict().refine((input) => Object.values(input).some((value) => value !== undefined), {
  message: '更新する項目を1つ以上指定してください',
})
export type UpdateEvidenceInput = z.input<typeof updateEvidenceSchema>
export type UpdateEvidenceData = z.output<typeof updateEvidenceSchema>
