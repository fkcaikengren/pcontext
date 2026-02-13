import { AsyncLocalStorage } from 'node:async_hooks'
import pino from 'pino'
import AppSettings from '@/settings'

const { config } = AppSettings

type TraceContext = {
  traceId: string
  taskId?: string
}

export const traceStorage = new AsyncLocalStorage<TraceContext>()

const transport = config.log.pretty && config.is_dev
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        singleLine: false,
      },
    })
  : undefined

export const logger = pino({
  level: config.log.level,
  enabled: config.log.enabled,
  redact: config.log.redact,
  mixin() {
    const store = traceStorage.getStore()
    if (!store) return {}
    const base: Record<string, string> = {}
    if (store.traceId) base.traceId = store.traceId
    return base
  },
}, transport)

export function runInContext<T>(traceId: string, fn: () => T, taskId?: string): T {
  return traceStorage.run({ traceId, taskId }, fn)
}
