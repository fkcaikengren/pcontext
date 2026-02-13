import { z } from 'zod'

export const CreateDocSchema = z.object({
  slug: z.string(),
  name: z.string(),
  source: z.enum(['git', 'website']),
  url: z.string(),
})

export type CreateDocDTO = z.infer<typeof CreateDocSchema>

const gitSshUrlRegex = /^git@.+(\.git)?$/

export const DocUrlSchema = z.string().refine(
  (value) => {
    try {
      new URL(value)
      return true
    } catch {
      return gitSshUrlRegex.test(value)
    }
  },
  { message: 'Invalid url' },
)

export const PositiveIntOptionalSchema = z.coerce.number().int().positive().optional()

export const DocListQuerySchema = z.object({
  page: PositiveIntOptionalSchema.default(1),
  limit: PositiveIntOptionalSchema.default(10),
  name: z.string().optional(),
  source: z.enum(['git', 'website']).optional(),
  type: z.enum(['favorites', 'trending']).optional(),
  createdFrom: PositiveIntOptionalSchema,
  createdTo: PositiveIntOptionalSchema,
  updatedFrom: PositiveIntOptionalSchema,
  updatedTo: PositiveIntOptionalSchema,
})

export type DocListQueryDTO = z.infer<typeof DocListQuerySchema>

export const DocAddBodySchema = z.object({
  url: DocUrlSchema,
  docName: z.string().optional(),
})

export type DocAddBodyDTO = z.infer<typeof DocAddBodySchema>
