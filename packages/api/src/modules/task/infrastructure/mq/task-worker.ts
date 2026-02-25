import type { Job } from 'bullmq'
import type { ITaskRepository } from '../../task.repo.interface'
import { Worker } from 'bullmq'
import { logger } from '@/shared/logger'
import { redis } from '@/shared/redis'

export type TaskProcessor = (job: Job) => Promise<any>

export class TaskWorker {
  private worker: Worker

  constructor(
    queueName: string,
    processor: TaskProcessor,
  ) {
    this.worker = new Worker(queueName, processor, {
      connection: redis,
      concurrency: 5, // Default concurrency
    })

    this.worker.on('completed', async (job) => {
      if (job.id) {
        // Notify end of stream
        await redis.publish(`task:${job.id}:events`, JSON.stringify({
          type: 'end',
          status: 'completed',
        }))
      }
    })

    this.worker.on('failed', async (job, err) => {
      if (job?.id) {
        // Notify end of stream
        await redis.publish(`task:${job.id}:events`, JSON.stringify({
          type: 'end',
          status: 'failed',
        }))
      }
      logger.error(`[Worker] Job ${job?.id} failed: ${err.message}`)
    })
  }

  async close() {
    await this.worker.close()
  }
}
