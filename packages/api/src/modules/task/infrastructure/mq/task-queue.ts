import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

export class TaskQueue extends Queue {
  constructor(queueName: string, connection: Redis) {
    super(queueName, {
      connection,
    })
  }
}
