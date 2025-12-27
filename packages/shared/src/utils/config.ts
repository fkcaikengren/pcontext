import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { boolean, z } from 'zod'
import { toMerged } from 'es-toolkit/object'
import { DEFAULT_SQLITEDB_FILE_PATH } from '../constant'


const PContextConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535),
  api_prefix: z.string().min(1),
  rate_limit_max: z.coerce.number().int().min(1).max(100000),
  jwt_secret: z.string().min(16),
  is_dev: z.boolean().default(true),
  http: z.record(z.string(), z.string()).default({}),
  log: z.object({
    level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    enabled: z.boolean().default(true),
    pretty: z.boolean().default(true),
    redact: z.array(z.string()).default([]),
    autoLoggingIgnorePaths: z.array(z.string()).default(['/health', '/api/health']),
  }).default({ level: 'info', enabled: true, pretty: true, redact: [], autoLoggingIgnorePaths: ['/health', '/api/health'] }),
  database: z.object({
    provider: z.enum(['postgresql', 'sqlite']).default('postgresql'),
    url: z.string().min(1).default('postgresql://postgres:Postgres@localhost:5432/pcontext'),
    ssl: boolean().default(false),
  }),
  agent: z.object({
    model: z.string().min(1),
    embedding: z.object({
      model: z.string().min(1),
      dim: z.coerce.number().int().min(1),
    }),
    client: z.object({
      api_key: z.string().min(0),
      base_url: z.string().min(1),
      temperature: z.coerce.number().min(0),
      max_tokens: z.coerce.number().int().min(1).optional(),
    }),
    milvus: z.object({
      address: z.string().min(1),
      username: z.string().min(1),
      password: z.string().min(1),
      collection_name: z.string().min(1),
      metric_type: z.string().min(1),
      index_type: z.string().min(1),
    }),
  }),

}).strict()

export type PContextConfig = z.infer<typeof PContextConfigSchema>

const PCONTEXT_CONFIG =  {
  // 服务端口
  port: 3000,
  // API 前缀
  api_prefix: '/api',
  // 限流配置
  rate_limit_max: 100,
  // JWT 密钥
  jwt_secret: 'A7SJKNEOMAWN2EDJ8JDSN2SK59KS8SJEL0KS8AJNN2',
  is_dev: true,

  // 请求头配置
  http: {
  },
  // 日志
  log: {
    level: 'info',
    enabled: true,
    pretty: true,
    redact: [],
    autoLoggingIgnorePaths: ['/health', '/api/health'],
  },
  // 数据库
  database: {
    // provider: 'postgresql',
    // url: 'postgresql://postgres:Postgres@localhost:5432/pcontext',
    provider: 'sqlite',
    url: `file:${DEFAULT_SQLITEDB_FILE_PATH}`,
    ssl:  false,//{ rejectUnauthorized: false }
  },
  // Llamaindex Agent 配置
  agent: {
    model: 'Qwen/Qwen3-32B',
    embedding: {
      model: 'Qwen/Qwen3-Embedding-4B',
      dim: 1536,
    },
    client: {
      api_key: '',
      base_url: 'https://api.siliconflow.cn/v1',
      temperature: 0.7,
      max_tokens: undefined,
    },
    milvus: {
      address: '127.0.0.1:19530',
      username: 'root',
      password: 'Milvus',
      collection_name: 'default',
      metric_type: 'COSINE',
      index_type: 'HNSW',
    },
  }
} as PContextConfig;

export async function loadPContextConfig(configPath?: string): Promise<PContextConfig> {
  if (!configPath) {
    return PCONTEXT_CONFIG
  }
  const fullPath = resolve(configPath)
  if (!existsSync(fullPath)) {
    throw new Error(`配置文件不存在: ${fullPath}`)
  }
  let userConfig: unknown
  try {
    if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs') || fullPath.endsWith('.cjs')) {
      const moduleUrl = pathToFileURL(fullPath).href
      const mod = await import(moduleUrl)
      userConfig = (mod as any).default ?? mod
    } else {
      const raw = readFileSync(fullPath, 'utf-8')
      userConfig = JSON.parse(raw)
    }
  } catch (e) {
    throw new Error(`配置文件读取或解析失败: ${(e as Error).message}`)
  }
  const merged = toMerged(PCONTEXT_CONFIG, userConfig as any)
  const result = PContextConfigSchema.safeParse(merged)
  if (!result.success) {
    const details = z.treeifyError(result.error)
    throw new Error(`配置文件验证失败: ${JSON.stringify(details)}`)
  }
  return result.data
}
