import type {
  BaseNodePostprocessor,
  NodeWithScore,
} from 'llamaindex'
import { MetadataMode } from 'llamaindex'

interface SiliconFlowRerankerOptions {
  apiKey: string
  model?: string
  topN?: number
}

interface SiliconFlowRerankerResult {
  index: number
  relevance_score: number
}

interface SiliconFlowRerankerResponse {

  id: string
  model: string
  results: SiliconFlowRerankerResult[]
  meta: {
    tokens: {
      input_tokens: number
      output_tokens: number
    }

  }
}

const DEFAULT_MODEL = 'Qwen/Qwen3-Reranker-4B'
const API_BASE_URL = 'https://api.siliconflow.cn/v1/rerank'

export class SiliconFlowReranker implements BaseNodePostprocessor {
  apiKey: string
  model: string
  topN?: number

  constructor(options: SiliconFlowRerankerOptions) {
    if (!options.apiKey) {
      throw new Error('SiliconFlowReranker requires an API key')
    }
    this.apiKey = options.apiKey
    this.model = options.model ?? DEFAULT_MODEL
    this.topN = options.topN
  }

  async _rerank(
    query: string,
    documents: string[],
    topN?: number,
  ): Promise<SiliconFlowRerankerResult[]> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        query,
        documents,
        top_n: topN ?? this.topN,
      }),
    })

    if (!response.ok || response.status !== 200) {
      const errorText = await response.text()
      throw new Error(
        `SiliconFlow rerank API error: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const jsonData = (await response.json()) as SiliconFlowRerankerResponse
    return jsonData.results
  }

  async postprocessNodes(
    nodes: NodeWithScore[],
    query?: string,
  ): Promise<NodeWithScore[]> {
    if (nodes.length === 0) {
      return []
    }

    if (!query) {
      throw new Error('SiliconFlowReranker requires a query')
    }

    const documents = nodes.map(n => n.node.getContent(MetadataMode.ALL))
    const results = await this._rerank(query, documents, this.topN)

    const newNodes: NodeWithScore[] = []
    for (const result of results) {
      const node = nodes[result.index]
      newNodes.push({
        node: node.node,
        score: result.relevance_score,
      })
    }

    return newNodes
  }
}
