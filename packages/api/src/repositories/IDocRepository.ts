import type { Pagination } from '@/domain/user.entity.ts'
import type { DocEntity, CreateDocInput as SharedCreateDocInput } from '@pcontext/shared/types'

export type DocRecord = DocEntity<Date>

export type CreateDocInput = SharedCreateDocInput

export interface IDocRepository {
  list: (page: number, limit: number, filters?: { q?: string; source?: 'git' | 'website'; createdFrom?: number; createdTo?: number; updatedFrom?: number; updatedTo?: number }, sort?: 'popularity' | 'createdAt' | 'updatedAt') => Promise<Pagination<DocRecord>>
  listFavoritesByUser: (userId: number, page: number, limit: number) => Promise<Pagination<DocRecord>>
  findById: (id: number) => Promise<DocRecord | null>
  findBySlug: (slug: string) => Promise<DocRecord | null>
  create: (input: CreateDocInput) => Promise<DocRecord>
  incrementAccess: (docId: number) => Promise<void>
  toggleFavorite: (userId: number, docId: number, like: boolean) => Promise<boolean>
  isFavorite: (userId: number, docId: number) => Promise<boolean>
}
