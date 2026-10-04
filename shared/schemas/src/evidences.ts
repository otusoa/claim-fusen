import * as z from 'zod'

export const createEvidenceSchema = z.object({
  projectId: z.uuid(),
  sourceId: z.uuid(),
  quote: z.string().nullish(),
  summary: z.string().nullish(),
  locator: z.string().nullish(),
  note: z.string().nullish(),
})

export type CreateEvidenceInput = z.input<typeof createEvidenceSchema>
export type CreateEvidenceData = z.output<typeof createEvidenceSchema>
