import type { DocEntity } from './doc.entity'

export interface DocSnippetVO {
  filePath: string
  content: string
  score?: number
}

export interface DocSnippetsVO {
  snippets: DocSnippetVO[]
}

export type DocVO = DocEntity<Date>
