export type DocSource = 'git' | 'website'

export type Doc = {
  id: number
  slug: string
  name: string
  source: DocSource
  url: string
  accessCount: number
  createdAt: Date
  updatedAt: Date
}
