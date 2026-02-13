import type { Pagination } from '@/domain/user.entity.ts'
import type { DocEntity, CreateDocInput as SharedCreateDocInput } from '@pcontext/shared/types'


export type CreateDocInput = SharedCreateDocInput

export interface IDocRepository {
  list: (page: number, limit: number, filters?: { q?: string; source?: 'git' | 'website'; createdFrom?: number; createdTo?: number; updatedFrom?: number; updatedTo?: number }, sort?: 'popularity' | 'createdAt' | 'updatedAt') => Promise<Pagination<DocEntity<Date>>>
  listFavoritesByUser: (userId: number, page: number, limit: number) => Promise<Pagination<DocEntity<Date>>>
  findById: (id: number) => Promise<DocEntity<Date> | null>
  findBySlug: (slug: string) => Promise<DocEntity<Date> | null>
  create: (input: CreateDocInput) => Promise<DocEntity<Date>>
  incrementAccess: (docId: number) => Promise<void>
  toggleFavorite: (userId: number, docId: number, like: boolean) => Promise<boolean>
  isFavorite: (userId: number, docId: number) => Promise<boolean>
}
