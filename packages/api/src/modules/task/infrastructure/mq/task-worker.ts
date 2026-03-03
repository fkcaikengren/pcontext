import type { Job } from 'bullmq'
import type { Redis } from 'ioredis'
import type { ITaskRepository } from '../../task.repo.interface'
import { Worker } from 'bullmq'
import { logger } from '@/shared/logger'
import { createRedisClient } from '@/shared/redis'

export type TaskProcessor = (job: Job) => Promise<any>

export class TaskWorker {
  private worker: Worker

  constructor(
    queueName: string,
    processor: TaskProcessor,
    connection: Redis = createRedisClient(),
  ) {
    this.worker = new Worker(queueName, processor, {
      connection,
      concurrency: 5, // Default concurrency
    })

    this.worker.on('completed', async (job) => {
      if (job.id) {
        // Notify end of stream
        await connection.publish(`task:${job.id}:events`, JSON.stringify({
          type: 'end',
          status: 'completed',
        }))
      }
    })

    this.worker.on('failed', async (job, err) => {
      if (job?.id) {
        // Notify end of stream
        await connection.publish(`task:${job.id}:events`, JSON.stringify({
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
