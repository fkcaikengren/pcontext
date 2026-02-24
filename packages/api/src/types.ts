export interface ApiSuccess<T = unknown> {
  code: number
  data: T
  message: string
}

export interface ApiError<T = unknown> {
  code: number
  data: T | null
  message: string
}
