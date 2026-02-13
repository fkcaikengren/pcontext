export type ApiSuccess<T = unknown> = {
  code: number
  data: T
  message: string
}

export type ApiError<T = unknown> = {
  code: number
  data: T | null
  message: string
}
