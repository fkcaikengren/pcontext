import type { PaginationVO } from '@/shared/vo'
import type { DocEntity } from '@/modules/doc/doc.entity'
import type { CreateDocDTO } from '@/modules/doc/doc.dto'

export interface IDocRepository {
  list: (page: number, pageSize: number, filters?: { q?: string; source?: 'git' | 'website'; createdFrom?: number; createdTo?: number; updatedFrom?: number; updatedTo?: number }, sort?: 'popularity' | 'createdAt' | 'updatedAt') => Promise<PaginationVO<DocEntity<Date>>>
  listFavoritesByUser: (userId: number, page: number, pageSize: number) => Promise<PaginationVO<DocEntity<Date>>>
  findById: (id: number) => Promise<DocEntity<Date> | null>
  findBySlug: (slug: string) => Promise<DocEntity<Date> | null>
  create: (input: CreateDocDTO) => Promise<DocEntity<Date>>
  incrementAccess: (docId: number) => Promise<void>
  toggleFavorite: (userId: number, docId: number, like: boolean) => Promise<boolean>
  isFavorite: (userId: number, docId: number) => Promise<boolean>
}
