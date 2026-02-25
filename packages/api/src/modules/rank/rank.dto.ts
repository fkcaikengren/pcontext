import { z } from 'zod'

export const RankDocsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
})

export type RankDocsQueryDTO = z.infer<typeof RankDocsQuerySchema>
