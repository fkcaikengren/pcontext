import type {
  ChatResponseChunk,
  NodeWithScore,
  VectorStoreIndex,
} from 'llamaindex'
import {
  createWorkflow,
  workflowEvent,
} from '@llamaindex/workflow'
import { Settings } from 'llamaindex'
import AppSettings from '@/settings'
import { generateFilters } from './query-filter'
import { SiliconFlowReranker } from './SiliconflowReranker'

const { config } = AppSettings

/**
 * 两阶段 RAG Workflow 事件定义
 */

// 检索请求事件
export const retrievalRequestEvent = workflowEvent<{
  query: string
  docIds?: string[]
}>()

// 第一阶段检索完成事件（向量检索完成）
export const retrievalCompleteEvent = workflowEvent<{
  query: string
  nodes: NodeWithScore[]
}>()

// 重排序完成事件（第二阶段完成）
export const rerankCompleteEvent = workflowEvent<{
  query: string
  nodes: NodeWithScore[]
}>()

// 流式响应事件（LLM 流式输出）
export const streamingResponseEvent = workflowEvent<{
  query: string
  delta: string
  isFirst: boolean
  isLast: boolean
}>()

/**
 * 两阶段 RAG Workflow 配置选项
 */
export interface TwoStageRAGOptions {
  // 第一阶段：向量检索返回的候选文档数量
  similarityTopK?: number
  // 第二阶段：重排序后返回的文档数量
  rerankTopN?: number
  // Cohere API Key（用于重排序）
  cohereApiKey?: string
  // 最小相似度阈值（低于此分数的文档将被过滤）
  minSimilarityScore?: number
}

/**
 * 创建两阶段 RAG Workflow
 *
 * 流程：
 * 1. 接收用户查询
 * 2. 第一阶段：向量检索 - 从索引中检索相似文档
 * 3. 第二阶段：重排序 - 使用 Cohere Reranker 对结果进行重排序
 * 4. 第三阶段：LLM 生成响应
 *
 * @param index VectorStoreIndex 实例
 * @param options 配置选项
 * @returns 配置好的 workflow
 */
export function createTwoStageRAGWorkflow(
  index: VectorStoreIndex,
  options: TwoStageRAGOptions = {},
) {
  const {
    similarityTopK = 9,
    rerankTopN = 3,
    minSimilarityScore = 0.5,
  } = options

  // 创建 reranker（如果提供了 API key）
  const reranker = new SiliconFlowReranker({
    apiKey: config.agent.client.api_key,
    topN: rerankTopN,
  })

  // 创建 workflow
  const workflow = createWorkflow()

  // 第一阶段：向量检索
  workflow.handle([retrievalRequestEvent], async (ctx, event) => {
    const { query, docIds } = event.data as { query: string, docIds?: string[] }
    console.log('[retrievalRequestEvent]: ', { query, docIds })
    // 创建检索器
    const retriever = index.asRetriever({
      similarityTopK,
      filters: docIds
        ? generateFilters(docIds)
        : undefined,
    })

    // 执行检索
    const nodes = await retriever.retrieve(query)

    // 过滤低相似度文档
    const filteredNodes = nodes.filter(
      (n: NodeWithScore) => (n.score ?? 0) >= minSimilarityScore,
    )
    // console.log('[retrievalRequestEvent]: nodes -> ', filteredNodes)
    // 发送检索完成事件
    return retrievalCompleteEvent.with({
      query,
      nodes: filteredNodes,
    })
  })

  // 第二阶段：重排序（可选）
  workflow.handle([retrievalCompleteEvent], async (ctx, event) => {
    const { query, nodes } = event.data

    let finalNodes = nodes

    // 如果配置了 reranker，进行重排序
    if (reranker && nodes.length > 0) {
      finalNodes = await reranker.postprocessNodes(nodes, query)
    }

    // console.log('[rerankCompleteEvent]: reranked nodes -> ', finalNodes)

    // 发送重排序完成事件，进入 LLM 响应阶段
    return rerankCompleteEvent.with({
      query,
      nodes: finalNodes,
    })
  })

  // 第三阶段：LLM 生成响应（流式）
  workflow.handle([rerankCompleteEvent], async (ctx, event) => {
    const { query, nodes: finalNodes } = event.data

    // 使用 LLM 生成响应
    const llm = Settings.llm
    if (!llm) {
      throw new Error('LLM not configured in Settings')
    }

    // 构建上下文
    const contextText = finalNodes
      .map(n => n.node.getContent())
      .join('\n\n')

    // 生成响应
    const prompt = `上下文：\n${contextText}\n\n问题：${query}\n\n回答：` // You are a helpful AI assistant. Answer the question based on the provided context.

    // TODO: 多轮对话上下文管理
    // 使用 chat 方法，传入流式参数获取 AsyncIterable
    const stream = await llm.chat({
      messages: [
        { role: 'system', content: '你是一个AI助手, 基于以下上下文回答用户的问题' },
        { role: 'user', content: prompt },
      ],
      stream: true,
    })

    // let fullResponse = ''
    let isFirst = true

    // 遍历流式响应并发送事件
    for await (const chunk of stream) {
      const delta = chunk.delta
      if (delta) {
        // fullResponse += delta
        ctx.sendEvent(streamingResponseEvent.with({
          query,
          delta,
          isFirst,
          isLast: false,
        }))

        isFirst = false
      }
    }

    // 发送最终响应事件
    return streamingResponseEvent.with({
      query,
      delta: '',
      isFirst: false,
      isLast: true,
    })
  })

  return workflow
}

/**
 * 执行两阶段 RAG 查询
 *
 * @param workflow 配置好的 workflow
 * @param query 用户查询
 * @param docIds 可选的文档 ID 过滤
 * @returns 查询结果
 */
export async function queryTwoStageRAG(
  workflow: ReturnType<typeof createTwoStageRAGWorkflow>,
  query: string,
  docIds?: string[],
) {
  const ctx = workflow.createContext()
  // 发送检索请求
  ctx.sendEvent(
    retrievalRequestEvent.with({ query, docIds }),
  )

  return ctx.stream
}
