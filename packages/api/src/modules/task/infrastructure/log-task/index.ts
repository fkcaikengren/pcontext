export type {
  Task,
  TaskLogListener,
  TaskManagerOptions,
} from './task'

import { TaskManager } from './task'
import type { TaskManagerOptions } from './task'

export type DefaultTaskModel = Record<string, unknown>

export function createTaskManager<TModel>(options?: TaskManagerOptions) {
  return new TaskManager<TModel>(options)
}
