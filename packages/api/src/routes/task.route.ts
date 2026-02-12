import { streamSSE } from 'hono/streaming'
import { createRouter } from '@/lib/create-app'
import { docTaskManager } from '@/services/task.service'
import type { TaskLogEvent } from '@pcontext/shared/types'
import { logger } from '@/lib/logger'



const router = createRouter()
	.get('/', async (c) => {
		const tasks = docTaskManager.listTasks()
		const items = tasks.map(item=>({
			...item,
			manager:undefined,
			log:undefined
		}))
		return c.json({ tasks:items })
	})
	.get('/:id', async (c) => {
		const { id } = c.req.param()
		if (!id) {
			return c.json({ message: '任务ID不能为空' }, 400)
		}
		const task = docTaskManager.getTask(id)
		if (!task) {
			return c.json({ message: '任务不存在' }, 404)
		}
		
		return c.json({
			task,
		})
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
					} catch {
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
					} catch {
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
	
			for await (const event of task.createLogStream()) { //输出日志流
				send(event as TaskLogEvent)
			}
		})
	})

export default router
