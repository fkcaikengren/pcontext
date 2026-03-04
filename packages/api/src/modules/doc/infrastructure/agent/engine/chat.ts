import process from 'node:process'
import { ContextChatEngine, Settings } from 'llamaindex'
import { getIndex } from '../storage'
import { generateFilters } from './query-filter'

/**
 * 创建一个上下文聊天引擎
 * ✅ 基于索引检索的上下文感知聊天
 * ✅ 支持流式响应
 * ✅ 可自定义系统提示和检索参数
 * ✅ 支持多轮对话
 * @param documentIds
 * @param params
 * @returns
 */
export async function createChatEngine(documentIds?: string[], params?: any) {


  
  const index = await getIndex()
  if (!index) {
    throw new Error(
      `StorageContext is empty - call 'npm run generate' to generate the storage first`,
    )
  }

  // TODO：优化process.env，改成配置文件
  const retriever = index.asRetriever({
    similarityTopK: process.env.TOP_K ? Number.parseInt(process.env.TOP_K) : 3,
    filters: generateFilters(documentIds || []),
  })
  const chatEngine = new ContextChatEngine({
    chatModel: Settings.llm,
    retriever,
    systemPrompt: process.env.SYSTEM_PROMPT || '你作为人工智能助手，从文档中检索相关信息来回答用户的问题，直接给出答案，不要说明过程，如果上下和问题无关，请直接回答不知道。',
  })
  return {
    retriever,
    chatEngine
  }
}
