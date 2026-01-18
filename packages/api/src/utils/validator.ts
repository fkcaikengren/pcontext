import { zValidator } from '@hono/zod-validator'

type ZValidator = typeof zValidator

/**
 * 解析json body参数 （需要请求的Content-Type: application/json）
 * @param schema zod schema
 * @returns 
 */
export const jsonValidator = (schema: Parameters<ZValidator>[1]) => {
  return zValidator(
    'json',
    schema,
    (result, c) => {
      
      if (!result.success) {
        // console.log(result.error.message) 是error.issues字符串
        // [
        //   {
        //     "code": "custom",
        //     "path": [
        //       "url"
        //     ],
        //     "message": "Invalid url"
        //   }
        // ]
        return c.json(
          { code: 400, errMsg: 'Validation failed', data: result.error.issues }, 
          400,
        )
      }
    },
  )
}

/**
 * 解析query参数
 * @param schema zod schema
 * @returns 
 */
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

