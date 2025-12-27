

export class HttpError extends Error {
  code: number;
  errMsg: string;
  data: Record<string, any>;

  constructor(code: number, errMsg: string, data?: Record<string, any>, options?: { cause?: unknown }) {
    super(errMsg, options);
    this.code = code;
    this.errMsg = errMsg;
    this.data = data || {};
    this.name = 'HttpError';
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
