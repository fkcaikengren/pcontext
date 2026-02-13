
export function Res200<T>(data: T, message: string = 'Success') {
  return {
    code: 200,
    data,
    message,
  }
}

export function Res201<T>(data: T, message: string = 'Created') {
  return {
    code: 201,
    data,
    message,
  }
}

export function Res204<T>(data: T | null = null, message: string = 'No Content') {
  return {
    code: 204,
    data,
    message,
  }
}

export function Res400<T>(data: T | null = null, message: string = 'Bad Request') {
  return {
    code: 400,
    data,
    message,
  }
}

export function Res401<T>(data: T | null = null, message: string = 'Unauthorized') {
  return {
    code: 401,
    data,
    message,
  }
}

export function Res403<T>(data: T | null = null, message: string = 'Forbidden') {
  return {
    code: 403,
    data,
    message,
  }
}

export function Res404<T>(data: T | null = null, message: string = 'Not Found') {
  return {
    code: 404,
    data,
    message,
  }
}

export function Res405<T>(data: T | null = null, message: string = 'Method Not Allowed') {
  return {
    code: 405,
    data,
    message,
  }
}

export function Res409<T>(data: T | null = null, message: string = 'Conflict') {
  return {
    code: 409,
    data,
    message,
  }
}

export function Res422<T>(data: T | null = null, message: string = 'Unprocessable Entity') {
  return {
    code: 422,
    data,
    message,
  }
}

export function Res429<T>(data: T | null = null, message: string = 'Too Many Requests') {
  return {
    code: 429,
    data,
    message,
  }
}

export function Res500<T>(data: T | null = null, message: string = 'Internal Server Error') {
  return {
    code: 500,
    data,
    message,
  }
}

export function Res503<T>(data: T | null = null, message: string = 'Service Unavailable') {
  return {
    code: 503,
    data,
    message,
  }
}
