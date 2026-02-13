import { MilvusVectorStore } from '@llamaindex/milvus'
import AppSettings from '@/settings'
import { logger } from '@/shared/logger'

const { config } = AppSettings

export class VectorStoreProvider {
  private static instance: MilvusVectorStore | null = null;

  /**
   * 获取全局唯一的 Milvus Vector Store 实例
   * 单例模式：整个应用生命周期只保持一个连接
   */
  static getVectorStore(): MilvusVectorStore {
    if (this.instance) {
      return this.instance;
    }

    const milvus = config.agent.milvus

    if (!milvus || !milvus.address) {
      logger.error('Agent config missing fields: milvus.address. exiting process')
      process.exit(1)
    }

    this.instance =  new MilvusVectorStore({
      params: {
        configOrAddress: milvus.address,
        username: milvus.username,
        password: milvus.password,
        ssl: false, //TODO: 增加配置
      },
      collection: milvus.collection_name,
    });
    return this.instance;
  }
}
