import type { TaskLogEvent } from './task.entity'
import type { TaskVO } from './task.vo'
import type { TaskDocDTO } from '@/modules/doc/doc.dto'
import type { ApiError, ApiSuccess } from '@/types'
import { streamSSE } from 'hono/streaming'
import z from 'zod'
import { createRouter } from '@/shared/create-app'
import { logger } from '@/shared/logger'
import { Res200, Res400, Res404 } from '@/shared/utils/response-template'
import { paramValidator, queryValidator } from '@/shared/utils/validator'

const idSchema = z.object({
  id: z.string(),
})

const listQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
})

const router = createRouter()
  .get('/', queryValidator(listQuerySchema), async (c) => {
    const { limit } = c.req.valid('query')

    const tasks = await c.var.taskService.listRecentTasksFromDb(limit)
    return c.json(Res200({ tasks }) as ApiSuccess<{
      tasks: TaskVO<TaskDocDTO>[]
    }>, 200)
  })
  .get('/:id', paramValidator(idSchema), async (c) => {
    const { id } = c.req.valid('param')
    const task = await c.var.taskService.getTaskDetail(id)
    return c.json(Res200({ task }) as ApiSuccess<{ task: TaskVO<TaskDocDTO> | null }>, 200)
  })
  .get('/:id/progress', (c) => {
    const { id } = c.req.param()

    return streamSSE(c, async (stream) => {
      const send = async (event: TaskLogEvent) => {
        if (event.type === 'log') {
          try {
            await stream.writeSSE({
              data: JSON.stringify([event.entry]),
            })
          }
          catch {
            logger.error(`sending task progress by SSE, taskId is ${id}`)
          }
          return
        }

        if (event.type === 'end') {
          try {
            await stream.writeSSE({
              data: event.status,
              event: 'end',
            })
          }
          catch {
            logger.error(`sending task end by SSE, taskId is ${id}`)
          }
        }
      }

      if (!id) {
        await stream.writeSSE({
          data: 'error: TASK_ID',
          event: 'error',
        })
        return
      }

      try {
        const logStream = await c.var.taskService.createLogStream(id)

        for await (const event of logStream) {
          await send(event as TaskLogEvent)
        }
      }
      catch (error: any) {
        logger.error(`Error streaming logs for task ${id}: ${error.message}`)
        await stream.writeSSE({
          data: 'error: INTERNAL_ERROR',
          event: 'error',
        })
      }
    })
  })

export default router
