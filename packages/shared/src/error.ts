
export class HttpError extends Error {

  constructor(
    message: string,
    public code: number,
    public data: Record<string, any> | null = null
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
