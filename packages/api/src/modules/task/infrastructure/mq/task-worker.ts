import type { Job } from 'bullmq'
import type { Redis } from 'ioredis'
import type { ITaskRepository } from '../../task.repo.interface'
import { Worker } from 'bullmq'
import { logger } from '@/shared/logger'
import { getRedis } from '@/shared/redis'

export type TaskProcessor = (job: Job) => Promise<any>

export class TaskWorker {
  private worker: Worker

  constructor(
    queueName: string,
    processor: TaskProcessor,
    connection: Redis,
  ) {
    this.worker = new Worker(queueName, processor, {
      connection,
      concurrency: 5, // Default concurrency
      lockDuration: 3600000, // 1 hour - extended for long-running tasks like git indexing
      stalledInterval: 30000, // Check for stalled jobs every 30 seconds
      maxStalledCount: 1, // Allow only one stall before marking job as failed
    })

    this.worker.on('completed', async (job) => {
      if (job.id) {
        // Notify end of stream
        try {
          await this.publishEndEvent(connection, job.id, 'completed')
        }
        catch (err) {
          logger.error(`[Worker] Failed to publish completion event for job ${job.id}: ${err}`)
        }
      }
    })

    this.worker.on('failed', async (job, err) => {
      if (job?.id) {
        // Notify end of stream
        try {
          await this.publishEndEvent(connection, job.id, 'failed')
        }
        catch (error) {
          logger.error(`[Worker] Failed to publish failure event for job ${job.id}: ${error}`)
        }
      }
      logger.error(`[Worker] Job ${job?.id} failed: ${err.message}`)
    })
  }

  private async publishEndEvent(redisConnection: Redis, jobId: string, status: 'completed' | 'failed') {
    try {
      // Check if connection is still active
      if (redisConnection.status === 'end') {
        logger.warn(`[Worker] Redis connection is closed, skipping event publish for job ${jobId}`)
        return
      }
      await redisConnection.publish(`task:${jobId}:events`, JSON.stringify({
        type: 'end',
        status,
      }))
    }
    catch (err) {
      // Log but don't throw - this is not critical for job completion
      logger.error(`[Worker] Error publishing end event for job ${jobId}: ${err}`)
    }
  }

  async close() {
    await this.worker.close()
  }
}
