import type { DocVO } from '@/modules/doc/doc.vo'

export type RankedDocVO = DocVO & {
  score: number
}
