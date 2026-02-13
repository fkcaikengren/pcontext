export interface ApiSuccess<T = null> {
  code: number
  data?: T | null
  message?: string
} 


export interface ApiError<T = null> {
  code: number,
  error?: T | null
  message?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError<T>
