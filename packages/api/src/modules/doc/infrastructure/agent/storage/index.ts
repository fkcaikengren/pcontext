// src/infrastructure/rag/storage/index-manager.ts
import {
  VectorStoreIndex,
} from 'llamaindex'
import { VectorStoreProvider } from './vector-store'

let indexCache: VectorStoreIndex | null = null

export async function getIndex(): Promise<VectorStoreIndex> {
  if (indexCache) {
    return indexCache
  }

  const vectorStore = VectorStoreProvider.getVectorStore()
  indexCache = await VectorStoreIndex.fromVectorStore(vectorStore)
  return indexCache
}

/**
 * 强制重新加载索引（用于测试或索引更新场景）
 */
export async function reloadIndex(): Promise<VectorStoreIndex> {
  indexCache = null
  return getIndex()
}
