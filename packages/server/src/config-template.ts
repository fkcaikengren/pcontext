export const CONFIG_TEMPLATE = `export default {
  // 服务端口
  port: 3000,
  // API 前缀
  api_prefix: '/api',
  // 限流配置
  rate_limit_max: 100,
  // JWT 密钥
  jwt_secret: 'A7SJKNEOMAWN2EDJ8JDSN2SK59KS8SJEL0KS8AJNN2',
  is_dev: true,

  // 数据库
  database: {
    // provider: 'postgresql',
    // url: 'postgresql://postgres:Postgres@localhost:5432/pcontext',
    url: 'file:../../data/sqlite/pcontext.db',
    provider: 'sqlite',
    ssl:  false,//{ rejectUnauthorized: false }
  },
  // Redis 配置
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'redis_Pwd',
  },
  // Llamaindex Agent 配置
  agent: {
    model: 'Pro/MiniMaxAI/MiniMax-M2.5',
    embedding: {
      model: 'Qwen/Qwen3-Embedding-4B',
      dim: 1536,
    },
    client: {
      api_key: 'sk-hkcagvznqagymczayxzmnbnctbqbbrtojrdjjtbvslmgjseh',
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
    firecrawl: {
      api_key: 'fc-fc2e3198a8814146a24cab60327040f9',
    }
  }
}`