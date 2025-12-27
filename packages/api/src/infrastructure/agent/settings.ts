import AppSettings from "@/settings";
import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import { Settings, CallbackManager } from "llamaindex";
import { logger } from '@/lib/logger'
import { VectorStoreProvider } from "./storage/vector-store";



const { config } = AppSettings

export function initSettings() {
  logger.info('Start', );
  const agent = config.agent
  const client = agent.client
  const embedding = agent.embedding
  const milvus = agent.milvus

  const missing: string[] = []

  if (!client.api_key || client.api_key.trim().length === 0) {
    missing.push('agent.client.api_key')
  }
  if (!client.base_url || client.base_url.trim().length === 0) {
    missing.push('agent.client.base_url')
  }
  if (!agent.model || agent.model.trim().length === 0) {
    missing.push('agent.model')
  }
  if (!embedding.model || embedding.model.trim().length === 0) {
    missing.push('agent.embedding.model')
  }
  if (!embedding.dim || embedding.dim <= 0) {
    missing.push('agent.embedding.dim')
  }
  if (!milvus || !milvus.address || milvus.address.trim().length === 0) {
    missing.push('agent.milvus.address')
  }

  if (missing.length > 0) {
    logger.error({ missing }, `Agent config missing fields: ${missing.join(', ')}`)
    process.exit(1)
  }


  Settings.llm = new OpenAI({
    model: agent.model,
    temperature: client.temperature,
    apiKey: client.api_key,
    baseURL: client.base_url,
    maxTokens: client.max_tokens,
  });
  logger.info(`Settings.llm initialized with: ${agent.model}`, );
  Settings.embedModel = new OpenAIEmbedding({
    model: embedding.model,
    apiKey: client.api_key,
    baseURL: client.base_url,
    dimensions: embedding.dim,
    timeout: 60 * 1000,
  });

  logger.info(`Settings.embedModel initialized with: ${embedding.model}`, );

    // 初始化vectorStore
  VectorStoreProvider.getVectorStore();



  if (process.env.QUERY_ENGINE_LOG === "true") {
    const callbackManager = new CallbackManager();
    callbackManager.on("query-start", (event) => {
      logger.info("[query-start]");
    });
    callbackManager.on("retrieve-start", (event) => {
      logger.info("[retrieve-start]");
    });
    callbackManager.on("retrieve-end", (event) => {
      logger.info("[retrieve-end]");
    });
    callbackManager.on("llm-start", (event) => {
      logger.info("[llm-start]");
    });
    callbackManager.on("llm-stream", (event) => {
      logger.info("[llm-stream]");
    });
    callbackManager.on("llm-end", (event) => {
      logger.info("[llm-end]");
    });
    callbackManager.on("query-end", (event) => {
      logger.info("[query-end]");
    });

    Settings.callbackManager = callbackManager;
  }
}
