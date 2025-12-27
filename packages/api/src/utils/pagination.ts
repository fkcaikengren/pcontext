export function validatePaginationQuery(query: Record<string, string | string[] | undefined>) {
  const page = Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1
  const limit = Number(Array.isArray(query.limit) ? query.limit[0] : query.limit) || 10
  const name = (Array.isArray(query.name) ? query.name[0] : query.name) || undefined
  return { page, limit, name }
}

