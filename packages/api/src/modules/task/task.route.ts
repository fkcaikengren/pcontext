import type { TaskLogEvent } from './task.entity'
import type { TaskVO } from './task.vo'
import type { TaskDocDTO } from '@/modules/doc/doc.dto'
import type { ApiError, ApiSuccess } from '@/types'
import { streamSSE } from 'hono/streaming'
import { docTaskManager } from '@/modules/task/task.service'
import { createRouter } from '@/shared/create-app'
import { logger } from '@/shared/logger'
import { Res200, Res400, Res404 } from '@/shared/utils/response-template'

const router = createRouter()
  .get('/', async (c) => {
    const tasks = docTaskManager.listTasks()
    const items: TaskVO<TaskDocDTO>[] = tasks.map(item => ({
      id: item.id,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      extraData: item.extraData,
      logs: item.logs,
      logsLength: item.logsLength,
    }))
    return c.json(Res200({ tasks: items }) as ApiSuccess<{
      tasks: TaskVO<TaskDocDTO>[]
    }>, 200)
  })
  .get('/:id', async (c) => {
    const { id } = c.req.param()
    if (!id) {
      return c.json(Res400({ message: '任务ID不能为空' }) as ApiError, 400)
    }
    const task = docTaskManager.getTask(id)
    if (!task) {
      return c.json(Res404({ message: '任务不存在' }) as ApiError, 404)
    }

    const taskVO: TaskVO = {
      id: task.id,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      extraData: task.extraData,
      logs: task.logs,
      logsLength: task.logsLength,
    }

    return c.json(Res200({ task: taskVO }) as ApiSuccess<{
      task: TaskVO<TaskDocDTO>
    }>, 200)
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

      const task = docTaskManager.getTask(id)

      if (!task) {
        await stream.writeSSE({
          data: 'error: TASK_NOT_FOUND',
          event: 'error',
        })
        return
      }

      for await (const event of task.createLogStream()) {
        send(event as TaskLogEvent)
      }
    })
  })

export default router
