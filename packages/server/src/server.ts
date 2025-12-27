type ApiConfig = {
  port?: number
  fetch: (req: Request) => Response | Promise<Response>
}

async function loadApiConfig(): Promise<ApiConfig> {
  try {
    const mod: any = await import('@pcontext/api')
    return (mod?.default ?? mod) as ApiConfig
  } catch {
    const isBun = typeof (globalThis as any).Bun !== 'undefined'
    const isDeno = typeof (globalThis as any).Deno !== 'undefined'
    try {
      const distUrl = new URL('../../api/dist/index.js', import.meta.url).href
      const mod: any = await import(distUrl)
      return (mod?.default ?? mod) as ApiConfig
    } catch {
      const srcUrl = new URL('../../api/src/index.ts', import.meta.url).href
      if (isBun || isDeno) {
        const mod: any = await import(srcUrl)
        return (mod?.default ?? mod) as ApiConfig
      }
      throw new Error('Cannot resolve @pcontext/api. Please install the package in Node environments.')
    }
  }
}

export async function start(options?: { port?: number; hostname?: string }) {
  const config = await loadApiConfig()
  const port = options?.port ?? config.port ?? 3000
  const hostname = options?.hostname ?? '0.0.0.0'

  const isBun = typeof (globalThis as any).Bun !== 'undefined'
  const isDeno = typeof (globalThis as any).Deno !== 'undefined'

  if (isBun && typeof (globalThis as any).Bun.serve === 'function') {
    ;(globalThis as any).Bun.serve({ ...config, port, hostname })
    console.log(`Server running on http://${hostname}:${port}`)
    return
  }

  if (isDeno && typeof (globalThis as any).Deno.serve === 'function') {
    ;(globalThis as any).Deno.serve({ port, hostname }, config.fetch)
    console.log(`Server running on http://${hostname}:${port}`)
    return
  }

  const { serve }: any = await import('@hono/node-server')
  serve({ fetch: config.fetch, port })
  console.log(`Server running on http://${hostname}:${port}`)
}
