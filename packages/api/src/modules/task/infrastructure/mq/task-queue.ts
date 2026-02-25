import { Queue } from 'bullmq'
import { redis } from '@/shared/redis'

export class TaskQueue extends Queue {
  constructor(queueName: string = 'task-queue') {
    super(queueName, {
      connection: redis,
    })
  }
}
