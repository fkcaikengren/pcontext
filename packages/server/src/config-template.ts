export const CONFIG_TEMPLATE = `export default {
  // 服务端口
  port: 3000,
  // API 前缀
  api_prefix: '/api',
  // 限流配置
  rate_limit_max: 100,
  // JWT 密钥
  jwt_secret: 'fill_your_jwt_secret(at least 32 characters)',
  is_dev: false,

  // 数据库
  database: {
    // provider: 'postgresql',
    // url: 'postgresql://postgres:Postgres@localhost:5432/pcontext',
    url: 'file:./pcontext.db',
    provider: 'sqlite',
    ssl:  true, //{ rejectUnauthorized: false }
  },
  // Redis 配置
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'fill_your_redis_password',
  },
  // Llamaindex Agent 配置
  agent: {
    model: 'Pro/MiniMaxAI/MiniMax-M2.5',
    embedding: {
      model: 'Qwen/Qwen3-Embedding-4B',
      dim: 1536,
    },
    client: {
      api_key: 'fill_your_model_api_key',
      base_url: 'https://api.siliconflow.cn/v1',
      temperature: 0.7,
      max_tokens: undefined,
    },
    milvus: {
      address: '127.0.0.1:19530',
      username: 'root',
      password: 'fill_your_milvus_password',
      collection_name: 'default',
      metric_type: 'COSINE',
      index_type: 'HNSW',
    },
    firecrawl: {
      api_key: 'fill_your_firecrawl_api_key',
    }
  }
}`