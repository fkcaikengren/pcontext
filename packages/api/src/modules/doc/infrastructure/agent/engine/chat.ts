import process from 'node:process'
import { agent } from '@llamaindex/workflow'
import { QueryEngineTool } from 'llamaindex'
import { getIndex } from '../storage'
import { generateFilters } from './query-filter'

/**
 * 创建一个 ReAct Agent，将 retriever 封装为工具调用
 * ✅ LLM 自主决定何时调用检索
 * ✅ 支持流式响应
 * ✅ 可自定义系统提示和检索参数
 * ✅ 支持多轮对话和工具调用
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

  const retriever = index.asRetriever({
    similarityTopK: process.env.TOP_K ? Number.parseInt(process.env.TOP_K) : 3,
    filters: generateFilters(documentIds || []),
  })

  // 将 retriever 转换为 QueryEngine，然后封装为 Tool
  const queryEngine = index.asQueryEngine({
    retriever,
  })

  const retrieveTool = new QueryEngineTool({
    queryEngine,
    metadata: {
      name: 'retrieve_documents',
      description:
        '当需要从知识库中检索相关信息来回答用户问题时调用此工具。如果用户问题与知识库无关，可以不调用。',
    },
    includeSourceNodes: false,
  })

  const ragAgent = agent({
    tools: [retrieveTool],
    systemPrompt:
      process.env.SYSTEM_PROMPT
      || '你作为人工智能助手，根据检索到的文档内容回答用户的问题。如果检索结果为空或与问题无关，请如实说明。',
  })

  return {
    retriever,
    agent: ragAgent,
  }
}
