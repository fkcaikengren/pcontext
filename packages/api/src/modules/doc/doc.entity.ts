import type { DocSourceEnumDTO } from '@/modules/doc/doc.dto'

export interface DocEntity<TDate> {
  id: number
  slug: string
  name: string
  source: DocSourceEnumDTO
  url: string
  taskId?: number
  accessCount: number
  createdAt: TDate
  updatedAt: TDate
}
