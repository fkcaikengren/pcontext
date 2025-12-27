import type { TaskLogEntry } from '@/services/task.service'
// 按指定格式格式化日期时间
export function formatDateTime(date: Date, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return format
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}


export function formatEntry(entry: TaskLogEntry): string {
      const parts: string[] = []
      parts.push(formatDateTime(new Date(entry.timestamp)))
      parts.push(entry.level.toUpperCase())
      if (entry.message && entry.message.length > 0) {
        parts.push(entry.message)
      }
      if (entry.data !== undefined) {
        try {
          parts.push(JSON.stringify(entry.data))
        } catch {}
      }
      return parts.join(' | ')
    }
