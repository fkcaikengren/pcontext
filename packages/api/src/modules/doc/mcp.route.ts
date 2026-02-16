import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { docMcpTools } from '@/modules/doc/mcp.service'
import { createRouter } from '@/shared/create-app'

function createMcpServer() {
  const server = new McpServer({ name: 'pcontext-doc', version: '0.0.1' })

  for (const tool of docMcpTools) {
    // Use Zod schema shape if available, otherwise fallback to the schema itself
    // This handles both direct Zod objects and other Zod types
    const inputSchema = (tool.schema as any).shape ?? tool.schema
    const outputSchema = (tool.outputSchema as any)?.shape ?? tool.outputSchema

    server.registerTool(
      tool.name,
      {
        title: tool.title ?? tool.name,
        description: tool.description,
        inputSchema,
        outputSchema,
      },
      async (input: unknown, _extra: unknown): Promise<CallToolResult> => {
        const result = await tool.handler(input as any)
        // Ensure result matches CallToolResult structure
        return result as CallToolResult
      },
    )
  }

  return server
}

const router = createRouter().all('/', async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true, // 响应application/json
  })

  const server = createMcpServer()
  await server.connect(transport)

  const contentType = c.req.header('content-type') ?? ''
  const parsedBody = contentType.includes('application/json')
    ? await c.req.json().catch(() => undefined)
    : undefined

  // WebStandardStreamableHTTPServerTransport handles Web Standard Request/Response natively
  const res = await transport.handleRequest(c.req.raw, { parsedBody })
  return res
})

export default router
