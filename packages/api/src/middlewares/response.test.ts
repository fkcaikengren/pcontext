import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { responseWrapper } from './response'

describe('responseWrapper', () => {
  it('wraps successful json responses', async () => {
    const app = new Hono()
    app.use(responseWrapper)
    app.get('/ok', c => c.json({ foo: 'bar' }))

    const res = await app.request('/ok')
    const body = await res.json() as any

    expect(res.status).toBe(200)
    expect(body).toEqual({
      code: 200,
      errMsg: '',
      data: { foo: 'bar' },
    })
  })

  it('wraps error json responses and preserves status', async () => {
    const app = new Hono()
    app.use(responseWrapper)
    app.get('/error', c => c.json({ message: 'error' }, 400))

    const res = await app.request('/error')
    const body = await res.json() as any

    expect(res.status).toBe(400)
    expect(body).toEqual({
      code: 400,
      errMsg: 'error',
      data: {},
    })
  })

  it('does not wrap non-json responses', async () => {
    const app = new Hono()
    app.use(responseWrapper)
    app.get('/text', () => new Response('ok', { headers: { 'Content-Type': 'text/plain' } }))

    const res = await app.request('/text')
    const text = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/plain')
    expect(text).toBe('ok')
  })
})
