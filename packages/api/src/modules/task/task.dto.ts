import { z } from 'zod'

export const CreateTaskSchema = z.object({
  type: z.string(),
  status: z.enum(['running', 'completed', 'failed']).optional(),
  message: z.string().nullable().optional(),
  extraData: z.any().nullable().optional(),
})

export type CreateTaskDTO = z.infer<typeof CreateTaskSchema>

export const CreateTaskLogSchema = z.object({
  taskId: z.string(),
  logLevel: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  createdAt: z.number().optional(),
  extraData: z.any().nullable().optional(),
  traceId: z.string().nullable().optional(),
})

export type CreateTaskLogDTO = z.infer<typeof CreateTaskLogSchema>
