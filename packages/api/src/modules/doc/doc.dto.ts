import { z } from 'zod'

export const PositiveIntOptionalSchema = z.coerce.number().int().positive().optional()

export const CreateDocSchema = z.object({
  slug: z.string().min(1).max(256),
  name: z.string().min(1).max(256),
  source: z.enum(['git', 'website']),
  url: z.string().url(),
})

export const DocAddBodySchema = z.object({
  url: z.string().url(),
  docName: z.string().min(1).max(256).optional(),
})

export const DocListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  name: z.string().optional(),
  source: z.enum(['git', 'website']).optional(),
  type: z.enum(['favorites', 'trending']).optional(),
  createdFrom: z.coerce.number().int().optional(),
  createdTo: z.coerce.number().int().optional(),
  updatedFrom: z.coerce.number().int().optional(),
  updatedTo: z.coerce.number().int().optional(),
})

export type CreateDocDTO = z.infer<typeof CreateDocSchema>
export type DocAddBodyDTO = z.infer<typeof DocAddBodySchema>
export type DocListQueryDTO = z.infer<typeof DocListQuerySchema>
