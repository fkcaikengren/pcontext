import { randomUUID } from 'node:crypto'
import { logger } from './logger'
import type {
  TaskStatus,
  TaskLogLevel,
  TaskLogEntry,
  TaskLogEvent,
  TaskLogMessage
} from '@pcontext/shared/types'
import { EventEmitter } from 'node:events';
import { PassThrough, Readable } from 'node:stream'

export type TaskLogListener = (event: TaskLogEvent) => void | Promise<void>

export type TaskManagerOptions = {
  taskTTL?: number
  maxLogsPerTask?: number
}


const COMPLETED_EVENT = { type: 'end', status: 'completed' }
const FAILED_EVENT = { type: 'end', status: 'failed' }


export class Task<TModel> extends EventEmitter {
  manager: TaskManager<TModel>
  id: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
  model?: TModel
  logs: TaskLogEntry[]
  dataEvent: symbol
  endEvent: symbol

  constructor(manager: TaskManager<TModel>, model?: TModel) {
    super();
    const now = Date.now()
    this.manager = manager
    this.id = randomUUID()
    this.status = 'running'
    this.createdAt = now
    this.updatedAt = now
    this.model = model
    this.logs = []

    this.dataEvent = Symbol('data')
    this.endEvent = Symbol('end')
  }
  

  log(level: TaskLogLevel, data: string | object, msg:string='' ){
    if (this.status !== 'running') return

    const logMsg = typeof data === 'string' ? { message: data } : {message:msg, data}
    const entry: TaskLogEntry = {
      timestamp: Date.now(),
      level,
      ...logMsg
    }

    this.logs.push(entry)
    this.updatedAt = entry.timestamp

    if (this.logs.length > this.manager.maxLogsPerTask) {
      const overflow = this.logs.length - this.manager.maxLogsPerTask
      this.logs.splice(0, overflow)
    }
    
    this.emit(this.dataEvent, { type: 'log', entry })
    return logger[level]?.(msg)
  }

  logInfo(data: string | object, msg:string=''){
    return this.log('info', data, msg)
  }

  endWithCompleted(): void {
    this.status = 'completed'
    logger.info(`[Task] task ${this.id} end with status completed`)
    this.emit(this.endEvent, COMPLETED_EVENT)
  }
  endWithFailed(): void {
    this.status = 'failed'
    logger.error(`[Task] task ${this.id} end with status failed`)
    this.emit(this.endEvent, FAILED_EVENT)
  }

  // 创建log stream
  createLogStream(): Readable {
    const output = new PassThrough({ objectMode: true });

    for (const log of this.logs) {
      output.write({ type: 'log', entry:log });
    }

    if (this.status === 'completed') {
      output.write(COMPLETED_EVENT);
      return output;
    }else if(this.status === 'failed'){
      output.write(FAILED_EVENT);
      return output;
    }

    const onData = (payload: any) => {
      output.write({ type: payload.type, entry:payload.entry });
    };

    const onEnd = (payload: any) => {
      output.write({ type: payload.type, status: payload.status });
      output.end();
      setTimeout(()=>{
        this.manager.removeTask(this.id)
      }, this.manager.taskTTL * 1000)
    };

    const cleanup = () => {
      this.off(this.dataEvent, onData);
      this.off(this.endEvent, onEnd);
    };

    this.on(this.dataEvent, onData);
    this.on(this.endEvent, onEnd);

    // 清理监听器
    output.on('close', () => {
      console.log('---------> clean log stream for task')
      cleanup();
    });

    return output;
  }
}

export class TaskManager<TModel = Record<string, unknown>>  {
  private readonly tasks = new Map<string, Task<TModel>>()

  readonly taskTTL: number
  readonly maxLogsPerTask: number

  constructor(options?: TaskManagerOptions) {
    this.taskTTL = options?.taskTTL ?? 30*60 // 任务保存时间
    this.maxLogsPerTask = options?.maxLogsPerTask ?? 3000 // 任务日志长度限制
  }

  createTask(model?: TModel): Task<TModel> {
    const task: Task<TModel> = new Task(this, model)
    this.tasks.set(task.id, task)
    return task
  }


  listTasks(): Task<TModel>[] {
    return Array.from(this.tasks.values())
  }

  getTask(id: string): Task<TModel> | null {
    return this.tasks.get(id) ?? null
  }

  removeTask(id: string){
    return this.tasks.delete(id)
  }
  
}
