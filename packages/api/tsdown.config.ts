import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'

// 读取 package.json 获取版本
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJsonPath = join(__dirname, 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version

export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: {
    esm: {
      target: ['es2022'],
    },
  },
  dts: true,
  sourcemap: false,
  clean: true,
  // 注入构建时常量
  define: {
    __VERSION__: JSON.stringify(version),
  },
  external: [
    'zod',
    'es-toolkit',
    '@pcontext/shared',
    'hono',
    'hono/*',
    '@hono/node-server',
    '@hono/vite-dev-server',
    '@hono/zod-validator',
    '@libsql/client',
    'drizzle-orm',
    'drizzle-zod',
    'ai',
    'llamaindex',
    '@llamaindex/*',
    '@ai-sdk/llamaindex',
    '@llamaindex/openai',
    '@llamaindex/readers',
    '@llamaindex/tools',
    '@llamaindex/workflow',
    '@llamaindex/milvus',
    '@mendable/firecrawl-js',
    '@modelcontextprotocol/sdk',
    '@zilliz/milvus2-sdk-node',
    'argon2',
    'bullmq',
    'casbin',
    'croner',
    'cross-env',
    'dotenv',
    'ioredis',
    'pg',
    'pino',
    'pino-http',
    'stoker',
    'uuidv7',
  ],
})
