import type { TaskDocDTO } from '@/modules/doc/doc.dto'
import type { TaskContext } from '@/modules/task/infrastructure/mq/task-context'
import process from 'node:process'
import { Document, storageContextFromDefaults, VectorStoreIndex } from 'llamaindex'
import AppSettings from '@/settings'
import { GitRepositoryReader } from '../loaders/git-repository-reader'
import { WebsiteCrawlReader } from '../loaders/website-crawl-reader'
import { VectorStoreProvider } from '../storage/vector-store'

const { config } = AppSettings

export interface GenerateOptions {
  url: string
  bizDocId?: string
}

export async function generateGitRepositoryData({
  url,
  bizDocId,
}: GenerateOptions, task: TaskContext<TaskDocDTO>) {
  task.logInfo({ url, bizDocId }, 'generateGitRepositoryData: start')

  // 处理url为git格式
  let repo = url.trim()
  if (!repo)
    throw new Error('Invalid url')
  const hashIndex = repo.indexOf('#')
  if (hashIndex !== -1)
    repo = repo.slice(0, hashIndex)
  const queryIndex = repo.indexOf('?')
  if (queryIndex !== -1)
    repo = repo.slice(0, queryIndex)
  repo = repo.trim()

  if (!repo.endsWith('.git')) { // url 转http git格式
    repo = `${repo}.git`
  }

  task.logInfo({ repo }, 'generateGitRepositoryData: normalized repository url')

  // 分割documents, 创建embeddings 和 存储到vectorStore
  const storageContext = await storageContextFromDefaults({
    vectorStore: VectorStoreProvider.getVectorStore(), // 指定vectorStore存储
  })
  task.logInfo('generateGitRepositoryData: storage context created')

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
    debug: true, // TODO: 处理debug参数
  })
  task.logInfo('generateGitRepositoryData: start fetching git repository and loading documents')
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
        'generateGitRepositoryData: embedding progress',
      )
    },
  }

  task.logInfo('generateGitRepositoryData: start indexing...')

  const index = await VectorStoreIndex.fromDocuments(documents, args)

  task.logInfo({ repo, docCount: documents.length }, 'generateGitRepositoryData: vector index created')

  // TODO：后面 改为专业的token计算
  const tokens = documents.reduce((sum, doc) => sum + doc.getText().length, 0)
  const snippets = documents.length

  // 插入的记录 {text, embedding}
  return { index, tokens, snippets }
}

export async function generateWebsiteData({
  url,
  bizDocId,
}: GenerateOptions, task: TaskContext<TaskDocDTO>) {
  task.logInfo({ url, bizDocId }, 'generateWebsiteData: start')

  const apiKey = config.agent.firecrawl?.api_key
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not set')
  }

  const reader = new WebsiteCrawlReader({
    baseUrl: url,
    apiKey,
    limit: 20, // TODO：limit参数 可配置
    debug: true,
    progress: (event, data) => {
      switch (event) {
        case 'start':
          // task.logInfo({ ...data }, 'Crawl: started' + (data as CrawlStartData))
          break
        case 'document':
          task.logInfo({ ...data }, 'Crawl: document fetched')
          break
        case 'done':
          task.logInfo({ ...data }, 'Crawl: done')
          break
      }
    },
  })
  task.logInfo('generateWebsiteData: start crawling the website')
  const documents = await reader.loadData()
  task.logInfo({ docCount: documents.length }, 'generateWebsiteData: documents loaded from website')

  if (documents.length === 0) {
    throw new Error('No pages found')
  }

  if (bizDocId) {
    for (const d of documents) {
      (d as any).metadata = { ...(d as any).metadata, biz_doc_id: bizDocId }
    }
    task.logInfo({ bizDocId, docCount: documents.length }, 'generateWebsiteData: bizDocId attached to documents metadata')
  }

  // 分割documents, 创建embeddings 和 存储到vectorStore
  const storageContext = await storageContextFromDefaults({
    vectorStore: VectorStoreProvider.getVectorStore(), // 指定vectorStore存储
  })
  task.logInfo('generateWebsiteData: storage context created')

  // 利用 runTransformations 产生了 nodes（数据库记录）
  const args = {
    storageContext,
    logProgress: true,
    progressCallback: (progress: number, total: number) => {
      task.logInfo(
        { progress, total },
        'generateWebsiteData: embedding progress',
      )
    },
  }

  task.logInfo('generateWebsiteData: start indexing...')
  const index = await VectorStoreIndex.fromDocuments(documents, args)

  task.logInfo({ url, docCount: documents.length }, 'generateWebsiteData: vector index created')

  // TODO：后面 改为专业的token计算
  const tokens = documents.reduce((sum, doc) => sum + doc.getText().length, 0)
  const snippets = documents.length

  // 插入的记录 {text, embedding}
  return { index, tokens, snippets }
}
