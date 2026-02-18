import { z } from 'zod'
import { paginationQuerySchema } from '@/shared/dto'

export const PositiveIntOptionalSchema = z.coerce.number().int().positive().optional()

export const CreateDocSchema = z.object({
  slug: z.string().min(1).max(256),
  name: z.string().min(1).max(256),
  source: z.enum(['git', 'website']),
  url: z.string().url(),
  taskId: z.number().int().positive().optional(),
})

export const DocAddBodySchema = z.object({
  url: z.string().url(),
  docName: z.string().min(1).max(256).optional(),
})

export const DocListQuerySchema = paginationQuerySchema.extend({
  name: z.string().optional(),
  source: z.enum(['git', 'website']).optional(),
  type: z.enum(['favorites', 'trending']).optional(),
  createdFrom: z.coerce.number().int().optional(),
  createdTo: z.coerce.number().int().optional(),
  updatedFrom: z.coerce.number().int().optional(),
  updatedTo: z.coerce.number().int().optional(),
})

export const DocSnippetsQuerySchema = z.object({
  topic: z.string().optional().default(''),
  tokens: PositiveIntOptionalSchema.default(10000),
})

export type CreateDocDTO = z.infer<typeof CreateDocSchema>
export type DocAddBodyDTO = z.infer<typeof DocAddBodySchema>
export type DocListQueryDTO = z.infer<typeof DocListQuerySchema>

export interface TaskDocDTO {
  id: number
  slug: string
  name: string
  source: string
  url: string
}
