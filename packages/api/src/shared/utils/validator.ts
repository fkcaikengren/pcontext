import { zValidator } from '@hono/zod-validator'

type ZValidator = typeof zValidator

export const jsonValidator = (schema: Parameters<ZValidator>[1]) => {
  return zValidator(
    'json',
    schema,
    (result, c) => {
      if (!result.success) {
        return c.json(
          { code: 400, errMsg: 'Validation failed', data: result.error.issues },
          400,
        )
      }
    },
  )
}

export const queryValidator = (schema: Parameters<ZValidator>[1]) => {
  return zValidator(
    'query',
    schema,
    (result, c) => {
      if (!result.success) {
        return c.json(
          { code: 400, errMsg: 'Validation failed', data: result.error.issues },
          400,
        )
      }
    },
  )
}
