export function isNil(v: any): v is null | undefined {
  return v === null || v === undefined
}

export function isString(v: any): v is string {
  return typeof v === 'string'
}

export function isNumber(v: any): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function isBoolean(v: any): v is boolean {
  return typeof v === 'boolean'
}

export function isFunction(v: any): v is Function {
  return typeof v === 'function'
}

export function isArray<T = any>(v: any): v is T[] {
  return Array.isArray(v)
}

export function isObject<T extends object = object>(v: any): v is T {
  return typeof v === 'object' && v !== null
}

export function isPlainObject(v: any): v is Record<string, any> {
  if (!isObject(v)) return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

export function isDate(v: any): v is Date {
  return v instanceof Date && !Number.isNaN(v.getTime())
}

export function isError(v: any): v is Error {
  return v instanceof Error
}

export function isPromise<T = any>(v: any): v is Promise<T> {
  return !!v && typeof v.then === 'function'
}

export function isEmpty(v: any): boolean {
  if (isNil(v)) return true
  if (isString(v) || isArray(v)) return v.length === 0
  if (v instanceof Map || v instanceof Set) return v.size === 0
  if (isPlainObject(v)) return Object.keys(v).length === 0
  return false
}
