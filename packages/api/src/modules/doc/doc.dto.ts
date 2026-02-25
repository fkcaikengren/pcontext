import { z } from 'zod'
import { paginationQuerySchema } from '@/shared/dto'

export const PositiveIntOptionalSchema = z.coerce.number().int().positive().optional()

export const DocSourceEnum = z.enum(['github', 'gitee', 'website'])

export const CreateDocSchema = z.object({
  slug: z.string().min(1).max(256),
  name: z.string().min(1).max(256),
  source: DocSourceEnum,
  url: z.url({ message: 'Invalid URL' }),
  taskId: z.uuid().optional(),
  tokens: z.number().int().default(0),
  snippets: z.number().int().default(0),
})

export const DocAddBodySchema = z.object({
  url: z.url({ message: 'Invalid URL' }),
  source: DocSourceEnum,
})

export const DocListQuerySchema = paginationQuerySchema.extend({
  name: z.string().optional(),
  source: DocSourceEnum.optional(),
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

export type DocSourceEnumDTO = z.infer<typeof DocSourceEnum>

export interface TaskDocDTO {
  id: string
  slug: string
  name: string
  source: DocSourceEnumDTO
  url: string
}
