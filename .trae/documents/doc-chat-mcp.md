# Doc 聊天接口 + MCP 能力：实施计划

## 目标

- 在 `packages/api` 的 `doc` 模块内补齐两类能力：
  - `POST /api/chat`：基于 LlamaIndex `ContextChatEngine` 的流式聊天接口，并用 `@ai-sdk/llamaindex` 输出 AI SDK 兼容的 UIMessage stream，便于前端直接用 `useChat`。
  - `Streamable HTTP` 形式的 MCP 端点（建议：`/api/mcp`）：通过 MCP Server 暴露 2 个工具，供客户端（IDE/Agent）调用：
    - `resolve-library-slug`
    - `get-library-docs`

## 现状盘点（已存在/需补齐）

- 已有 `ContextChatEngine` 工厂：[chat.ts](file:///Users/tangshiwen/Documents/vscode/web/startup/pcontext/packages/api/src/modules/doc/infrastructure/agent/engine/chat.ts)
- 已有 AI SDK 兼容的 chat handler：[chat.service.ts](file:///Users/tangshiwen/Documents/vscode/web/startup/pcontext/packages/api/src/modules/doc/chat.service.ts)
- 已有子路由文件：[chat.route.ts](file:///Users/tangshiwen/Documents/vscode/web/startup/pcontext/packages/api/src/modules/doc/chat.route.ts)
- 但 chat 未挂载到主路由（`server.ts` 里 `/chat` 被注释），且 `mcp.route.ts` 当前是空文件。
- Casbin seed policy 里已放行 `guest POST /api/chat`，但未放行 MCP 路径：[enforcer.ts](file:///Users/tangshiwen/Documents/vscode/web/startup/pcontext/packages/api/src/modules/user/infrastructure/casbin/enforcer.ts#L24-L47)

## 计划步骤

### 1) 路由层：对外暴露 `/api/chat` 与 `/api/mcp`

- 在 `packages/api/src/server.ts`：
  - 引入 `doc/chat.route.ts` 并挂载为 `.route('/chat', chatRouter)`，确保最终路径为 `POST /api/chat`。
  - 引入 `doc/mcp.route.ts` 并挂载为 `.route('/mcp', mcpRouter)`，确保最终路径为 `POST/GET /api/mcp`（取决于 MCP transport 的需要，通常 `all`）。
- 保持 doc REST 接口仍在 `/api/docs/...`，不改变现有路径。

### 2) Chat 接口：对齐你给的请求协议与 AI SDK 输出

- 以现有 [chat.service.ts](file:///Users/tangshiwen/Documents/vscode/web/startup/pcontext/packages/api/src/modules/doc/chat.service.ts) 为基础做必要增强（若无需则保持）：
  - 请求体字段：`libraryName`（doc slug）、`messages`（AI SDK UIMessage[]），可选 `data` 透传检索参数。
  - 使用 `createChatEngine([libraryName])` 构建检索过滤（`biz_doc_id`）并调用 `chatEngine.chat({ stream:true })`。
  - 用 `toUIMessageStream(stream)` + `createUIMessageStreamResponse(...)` 返回流式响应，确保前端 `useChat` 可直接消费。
- 若发现 UIMessage parts 解析与当前 `ai@5` 结构不完全一致，会在不破坏兼容性的前提下做容错处理（例如同时支持 `parts` 与 `content`）。

### 3) MCP：实现 Streamable HTTP MCP Server + 2 个工具

#### 3.1 选择 SDK/中间件实现方式

- 首选按官方 TS SDK 的 Hono middleware 方式实现（Streamable HTTP）：
  - `McpServer`
  - `WebStandardStreamableHTTPServerTransport`（或 Node 版本 transport，取决于运行环境）
  - `transport.handleRequest(c.req.raw, { parsedBody: c.get('parsedBody') })`
- 执行阶段会先确认当前 monorepo 依赖是否已包含所需导出：
  - 如果 `@modelcontextprotocol/sdk` 已覆盖 `@modelcontextprotocol/server`/`@modelcontextprotocol/hono` 的导出，则直接使用。
  - 如果没有，则在根 `package.json` 增补官方包（`@modelcontextprotocol/server`、`@modelcontextprotocol/hono`、必要时 `@modelcontextprotocol/node`），保证与 `bun` workspace 一致。

#### 3.2 工具工厂：实现 `createTool`

- 新增一个轻量工具工厂（放在 `packages/api/src/shared/mcp/createTool.ts` 或 `modules/doc` 内部，按现有代码组织习惯选更合适的位置）：
  - 输入：`{ name, description, schema, handler, title? , outputSchema? }`
  - 输出：标准化 tool 对象，供 MCP server 注册时使用（循环 `tools.forEach(t => server.registerTool(...))`）。

#### 3.3 两个工具的实现逻辑

1. `resolve-library-slug`
   - 入参：`{ libraryName: string }`
   - 实现：通过 `docRepo.list(page=1,pageSize=N,{ q: libraryName })` 做 `name like %q%` 查询（当前 pg/sqlite 都支持）。
   - 输出：匹配列表（建议包含 `slug`,`name`,`source`,`url`，并按简单匹配度排序：完全相等 > 前缀 > 包含）。

2. `get-library-docs`
   - 入参：`{ slug: string, topic?: string, tokens?: number }`（slug 必需；topic/tokens 给默认值）
   - 实现：
     - `getDocDetail(slug)` 获取元信息（不存在则返回明确错误文本）。
     - `generateLlmText(slug, topic, tokens)` 作为“详细文档内容”（基于向量检索拼接片段）。
   - 输出：`content` 返回可读文本；`structuredContent` 返回结构化对象 `{ doc, llmText }`。

### 4) 权限：放行 MCP 端点（避免被 authorization 中间件拦截）

- 在 casbin seed policies 中新增对 `guest` 的放行规则：
  - `['guest', '/api/mcp', '.*']`（或仅 `POST`，取决于 transport 是否需要多方法）。
- 保持现有 `guest POST /api/chat` 不变。

### 5) 验证与回归

- 类型检查/构建：
  - 确认 `packages/api` 编译通过（重点：MCP imports、Hono router 泛型、ai-sdk stream response 类型）。
- 手工验证：
  - `POST /api/chat`：给定 `libraryName + messages` 可流式返回。
  - `/api/mcp`：用一个最小 MCP client/或 curl 按 Streamable HTTP 协议触发 `tools/list` 与 `tools/call`（至少验证两工具可被发现与调用）。
- 回归 doc REST：
  - `/api/docs`、`/api/docs/:slug`、`/api/docs/:slug/llm.txt`、`/api/docs/:slug/query` 仍正常。

## 交付物（会改动/新增的文件）

- 更新：
  - `packages/api/src/server.ts`（挂载 chat 与 mcp）
  - `packages/api/src/modules/user/infrastructure/casbin/enforcer.ts`（放行 `/api/mcp`）
- 新增/补齐：
  - `packages/api/src/modules/doc/mcp.route.ts`（MCP 端点与 server 初始化）
  - `packages/api/src/shared/mcp/createTool.ts`（或等价位置，工具工厂）
  - `packages/api/src/modules/doc/mcp.tools.ts`（或等价位置，集中定义两个工具及其 schema/handler）

