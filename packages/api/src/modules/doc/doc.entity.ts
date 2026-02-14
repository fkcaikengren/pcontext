export type DocSource = 'git' | 'website'

export interface DocEntity<TDate> {
  id: number
  slug: string
  name: string
  source: DocSource
  url: string
  taskId?: number
  accessCount: number
  createdAt: TDate
  updatedAt: TDate
}

