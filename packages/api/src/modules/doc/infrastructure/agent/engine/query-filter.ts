import type { MetadataFilter, MetadataFilters } from 'llamaindex'

export function generateFilters(documentIds: string[]): MetadataFilters {
  const filter: MetadataFilter = {
    key: 'biz_doc_id',
    value: documentIds,
    operator: 'in',
  }

  return { filters: [filter] }
}
