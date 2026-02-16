// src/infrastructure/rag/storage/index-manager.ts
import {
  VectorStoreIndex,
} from 'llamaindex'
import { VectorStoreProvider } from './vector-store'

export function getIndex() {
  const vectorStore = VectorStoreProvider.getVectorStore()
  return VectorStoreIndex.fromVectorStore(vectorStore)
}
