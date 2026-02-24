import type { Document } from 'llamaindex'
import FirecrawlApp from '@mendable/firecrawl-js'
import { Document as LlamaDocument } from 'llamaindex'
import { logger } from '@/shared/logger'

export interface WebsiteCrawlReaderOptions {
  baseUrl: string
  apiKey: string
  limit?: number
  excludeTags?: string[]
  debug?: boolean
  progress?: CrawlProgressCallback
}

export interface CrawlStartData { baseUrl: string, limit: number, jobId?: string }
export interface CrawlDocumentData { url: string, title: string, count: number }
export interface CrawlDoneData { count: number }

export interface CrawlProgressCallback {
  (event: 'start', data: CrawlStartData): void
  (event: 'document', data: CrawlDocumentData): void
  (event: 'done', data: CrawlDoneData): void
}

const DEFAULT_EXCLUDE_TAGS = [
  'nav',
  'header',
  'footer',
  'aside',
  'script',
  'style',
  // 把代码行号也屏蔽掉
  '.cm-gutter',
  '.cm-lineNumbers',
  '.cm-gutterElement',
  '.sp-line-numbers',
  '.sp-pre-placeholder',
]

export class WebsiteCrawlReader {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly limit: number
  private readonly excludeTags: string[]
  private readonly debug: boolean
  private readonly progress?: CrawlProgressCallback

  constructor(options: WebsiteCrawlReaderOptions) {
    this.baseUrl = options.baseUrl
    this.apiKey = options.apiKey
    this.limit = options.limit ?? 100
    this.excludeTags = options.excludeTags ?? DEFAULT_EXCLUDE_TAGS
    this.debug = options.debug ?? false
    this.progress = options.progress
  }

  async loadData(): Promise<Document[]> {
    const firecrawl = new FirecrawlApp({ apiKey: this.apiKey })

    logger.info(`🚀 开始爬取网站: ${this.baseUrl}，最多抓取 ${this.limit} 页...`)
    this.progress?.('start', { baseUrl: this.baseUrl, limit: this.limit })

    try {
      const crawlResponse = await firecrawl.startCrawl(this.baseUrl, {
        limit: this.limit,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
          excludeTags: this.excludeTags,
        },
      })

      if (!crawlResponse.id) {
        throw new Error(`Failed to start crawl: ${JSON.stringify(crawlResponse)}`)
      }

      const jobId = crawlResponse.id
      this.progress?.('start', { baseUrl: this.baseUrl, limit: this.limit, jobId })

      const documents: Document[] = []
      const watcher = firecrawl.watcher(jobId, { kind: 'crawl', pollInterval: 2, timeout: 120 })

      return await new Promise<Document[]>((resolve, reject) => {
        watcher.on('document', (doc) => {
          const document = new LlamaDocument({
            text: doc.markdown || '',
            metadata: {
              source: doc.metadata?.sourceURL || doc.metadata?.url || this.baseUrl,
              title: doc.metadata?.title || '未命名页面',
            },
          })
          documents.push(document)
          // console.log(`已获取页面 ${document.metadata.source}，标题: ${document.metadata.title}`)
          // console.log(doc.markdown)
          this.progress?.('document', {
            url: document.metadata.source,
            title: document.metadata.title,
            count: documents.length,
          })
        })

        watcher.on('error', (err: any) => {
          logger.error(err, 'Watcher error')
          reject(err)
        })

        watcher.on('done', (state) => {
          if (state.status === 'failed') {
            logger.error(`爬取失败: ${state.status}`)
            reject(new Error(`爬取失败: ${state.status}`))
          }
          else {
            logger.info(`✅ 爬取完成！共成功获取并去噪了 ${documents.length} 个页面。`)
            this.progress?.('done', { count: documents.length })
            resolve(documents)
          }
        })

        watcher.start()
      })
    }
    catch (error) {
      logger.error(error, '❌ 抓取过程中发生错误')
      throw error
    }
  }
}
