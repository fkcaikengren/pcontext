export interface DocEntity<TDate> {
  id: number
  slug: string
  name: string
  source: 'git' | 'website'
  url: string
  accessCount: number
  createdAt: TDate
  updatedAt: TDate
}

export interface CreateDocInput {
  slug: string
  name: string
  source: 'git' | 'website'
  url: string
}
