import { logger } from '@/lib/logger'
import { storageContextFromDefaults, VectorStoreIndex } from 'llamaindex'
import { VectorStoreProvider } from '../storage/vector-store'
import { GitRepositoryReader } from '../loaders/git-repository-reader'
import { Task } from '@/infrastructure/log-task'
import { DocTaskModel } from '@pcontext/shared/types'


export interface GenerateGitRepositoryDataOptions {
  url: string
  bizDocId?: string
}


export async function generateGitRepositoryData({
  url,
  bizDocId,
}: GenerateGitRepositoryDataOptions, task: Task<DocTaskModel>) {
  task.logInfo({ url, bizDocId }, 'generateGitRepositoryData: start')

  // 处理url为git格式
  let repo = url.trim()
  if (!repo)
    throw new Error('Invalid url')
  const hashIndex = repo.indexOf('#')
  if (hashIndex !== -1) repo = repo.slice(0, hashIndex)
  const queryIndex = repo.indexOf('?')
  if (queryIndex !== -1) repo = repo.slice(0, queryIndex)
  repo = repo.trim()

  if (!repo.endsWith('.git')) { //url 转http git格式
    repo = `${repo}.git`
  }

  task.logInfo({ repo }, 'generateGitRepositoryData: normalized repository url')

  // 分割documents, 创建embeddings 和 存储到vectorStore
  const storageContext = await storageContextFromDefaults({
    vectorStore: VectorStoreProvider.getVectorStore(),  // 指定vectorStore存储
  })
  task.logInfo('generateGitRepositoryData: storage context created')

  // load documents from current directory into an index
  // const reader = new SimpleDirectoryReader();
  // const documents = await reader.loadData("data/test");
  const reader = new GitRepositoryReader({
    repo,
    filterDirectories: {
      includes: [],
      excludes: ['src/tests', 'docs/assets'],
    },
    filterFileExtensions: {
      includes: ['.md'],
      excludes: ['.zip', '.tar.gz'],
    },
    debug: true, //TODO: 处理debug参数
  })
  const documents = await reader.loadData()
  task.logInfo({ repo, docCount: documents.length }, 'generateGitRepositoryData: documents loaded from repository')

  if (bizDocId) {
    for (const d of documents) {
      (d as any).metadata = { ...(d as any).metadata, biz_doc_id: bizDocId }
    }
    task.logInfo({ bizDocId, docCount: documents.length }, 'generateGitRepositoryData: bizDocId attached to documents metadata')
  }

  // 利用 runTransformations 产生了 nodes（数据库记录）
  const args = {
    storageContext,
    logProgress: true,
    progressCallback: (progress: number, total: number) => {
      task.logInfo(
        { progress, total },
        'generateGitRepositoryData: embedding progress'
      )
    },
  }

  const index = await VectorStoreIndex.fromDocuments(documents, args)

  task.logInfo({ repo, docCount: documents.length }, 'generateGitRepositoryData: vector index created')

  // 插入的记录 {text, embedding}
  return index
}
