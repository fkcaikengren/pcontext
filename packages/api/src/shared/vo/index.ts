export interface PaginationVO<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
