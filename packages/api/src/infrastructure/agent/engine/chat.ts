import { ContextChatEngine, Settings } from "llamaindex";
import { getIndex } from "../storage";
import { generateFilters } from "./query-filter";
import process from "node:process";


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
  const index = await getIndex();
  if (!index) {
    throw new Error(
      `StorageContext is empty - call 'npm run generate' to generate the storage first`,
    );
  }
  const retriever = index.asRetriever({
    similarityTopK: process.env.TOP_K ? parseInt(process.env.TOP_K) : 3,
    filters: generateFilters(documentIds || []),
  });

  return new ContextChatEngine({
    chatModel: Settings.llm,
    retriever,
    systemPrompt: process.env.SYSTEM_PROMPT,
  });
}
