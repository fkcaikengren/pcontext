
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { loadPContextConfig, type PContextConfig } from '@pcontext/shared';


type ApiConfig = {
  port?: number
  fetch: (req: Request) => Response | Promise<Response>
}

async function loadApiConfig(): Promise<ApiConfig> {
  const apiApp = (await import('@pcontext/api')).default as ApiConfig
  return apiApp
}

export async function start(options?: { port?: number; hostname?: string }) {
  const config = await loadApiConfig()
  const port = options?.port ?? config.port ?? 3000
  const hostname = options?.hostname ?? '0.0.0.0'

  const isBun = typeof (globalThis as any).Bun !== 'undefined'
  const isDeno = typeof (globalThis as any).Deno !== 'undefined'

  if (isBun && typeof (globalThis as any).Bun.serve === 'function') {
    ;(globalThis as any).Bun.serve({ ...config, port, hostname })
    console.log(`Server running on http://${hostname}:${port}`)
    return
  }

  if (isDeno && typeof (globalThis as any).Deno.serve === 'function') {
    ;(globalThis as any).Deno.serve({ port, hostname }, config.fetch)
    console.log(`Server running on http://${hostname}:${port}`)
    return
  }

  const { serve }: any = await import('@hono/node-server')
  serve({ fetch: config.fetch, port })
  console.log(`Server running on http://${hostname}:${port}`)
}


// 默认配置文件的名称
const DEFAULT_CONFIG_NAME = 'pcontext.config.js';

const program = new Command();

// 配置 init 子命令
program
  .command('init')
  .description('在当前目录创建配置文件')
  .action(() => {
    const configContent = `// ${DEFAULT_CONFIG_NAME}

// 这是一个 TypeScript 格式的示例配置文件
// export default { ... } 是 ESM/TS 推荐的写法
export default {
    port: 3000,
    database: {
        host: 'localhost',
        name: 'pcontext_db'
    }
};
`;
    const targetPath: string = path.join(process.cwd(), DEFAULT_CONFIG_NAME);

    if (fs.existsSync(targetPath)) {
      console.warn(`⚠️ 警告：文件 ${DEFAULT_CONFIG_NAME} 已存在，跳过创建。`);
      return;
    }

    try {
      fs.writeFileSync(targetPath, configContent);
      console.log(`✨ 成功创建配置文件: ${targetPath}`);
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : "未知错误";
      console.error(`❌ 创建文件失败: ${errorMessage}`);
    }
  });

// 配置 start 子命令
program
  .command('start')
  .description('使用指定的配置文件路径启动服务')
  .option('-c, --config <path>', '配置文件路径', './pcontext.config.js')
  .option('-p, --port <number>', '端口号')
  .option('-h, --hostname <string>', '主机名', '0.0.0.0')
  .action(async (options) => {
    const configPath = options.config;

    if (typeof configPath !== 'string') {
      console.error('❌ 错误：`start` 命令缺少必需的 `--config` 参数。');
      console.log('💡 用法示例: node dist/index.js start --config ./pcontext.config.js');
      return;
    }

    console.log(`🚀 准备启动服务，使用配置路径: ${configPath}`);

    try {
      const config: PContextConfig = await loadPContextConfig(configPath);
      console.log('\n--- 启动配置详情 ---');
      console.log(config);
      console.log('----------------------');
      console.log(`✅ 服务已成功启动在端口 ${config.port}`);
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : '未知错误';
      console.error(`❌ 启动失败：配置加载失败: ${errorMessage}`);
    }
  });

// 解析命令行参数
program.parse(process.argv);
