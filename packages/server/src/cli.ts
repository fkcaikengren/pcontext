
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';

import { getRuntime, getDirname, type PContextConfig } from '@pcontext/shared';
import { initApp, loadSettingsConfig} from '@pcontext/api';


import app from '@pcontext/api'
import { CONFIG_TEMPLATE } from './config-template';



// 根据运行时环境获取 serveStatic 中间件
async function getServeStatic(runtime: string) {
  switch (runtime) {
    case 'bun': {
      const { serveStatic } = await import('hono/bun');
      return serveStatic;
    }
    case 'deno': {
      const { serveStatic } = await import('hono/deno');
      return serveStatic;
    }
    case 'node': {
    
      const { serveStatic } = await import('@hono/node-server/serve-static');
      return serveStatic;
    }
    default:
      throw new Error(`不支持的运行时环境: ${runtime}`);
  }
}


// 根据运行时环境启动服务
async function startServer(port: number, hostname: string) {
  const runtime = getRuntime();
  console.log(`🔍 检测到运行时环境: ${runtime}`);

  const isProduction = process.env.NODE_ENV === 'production';
  const webClientPath = path.resolve(getDirname(import.meta.url), isProduction ? './build/client' : '../../web/build/client')

  // 获取静态文件中间件
  const serveStatic = await getServeStatic(runtime);

  // 静态资源
  app.get('/assets/*', serveStatic({root:webClientPath}))
  app.get('/favicon.ico', serveStatic({root:webClientPath, path:'favicon.ico'}))
  
  app.get('/', serveStatic({root:webClientPath, path:'index.html'}))
  app.get('/login', serveStatic({root:webClientPath, path:'index.html'}))
  app.get('/docs', serveStatic({root:webClientPath, path:'index.html'}))
  app.get('/docs/*', serveStatic({root:webClientPath, path:'index.html'}))
  app.get('/add-docs', serveStatic({root:webClientPath, path:'index.html'}))
  app.get('/tasks', serveStatic({root:webClientPath, path:'index.html'}))
  app.get('/tasks/*', serveStatic({root:webClientPath, path:'index.html'}))
  app.get('/users', serveStatic({root:webClientPath, path:'index.html'}))
  app.get('/permissions', serveStatic({root:webClientPath, path:'index.html'}))
  app.get('/profile', serveStatic({root:webClientPath, path:'index.html'}))

  switch (runtime) {
    case 'bun': {
      // Bun 使用 Bun.serve
      const globalBun = globalThis as any;
      globalBun.Bun.serve({
        port,
        hostname,
        fetch: app.fetch,
        idleTimeout: 120, // 设置较大空闲超时（最大255s），防止流式响应被过早关闭
      });
      break;
    }

    case 'node': {
      const { serve } = await import('@hono/node-server');
      serve(app);
      break;
    }

    case 'deno': {
      // Deno 使用 Deno.serve (基于 fetch API)
      const globalDeno = globalThis as any;
      globalDeno.serve({
        port,
        hostname,
        fetch: app.fetch,
      });
      break;
    }

    default:
      // 未知环境，尝试使用 fetch API (Cloudflare Workers 等)
      console.warn('⚠️ 未识别的运行时环境，尝试使用标准 fetch API');
      throw new Error(`不支持的运行时环境: ${runtime}`);
  }
}

/* ========================== 注册命令 ========================== */

// 默认配置文件的名称
const DEFAULT_CONFIG_NAME = 'pcontext.config.js';
const PID_FILE_NAME = '.pcontext.pid';

// 获取 PID 文件路径
function getPidFilePath(): string {
  return path.join(process.cwd(), PID_FILE_NAME);
}

// 保存 PID 到文件
function savePid(pid: number): void {
  const pidPath = getPidFilePath();
  fs.writeFileSync(pidPath, pid.toString(), 'utf-8');
}

// 读取 PID 文件
function readPid(): number | null {
  const pidPath = getPidFilePath();
  if (!fs.existsSync(pidPath)) {
    return null;
  }
  const pidStr = fs.readFileSync(pidPath, 'utf-8').trim();
  const pid = parseInt(pidStr, 10);
  return isNaN(pid) ? null : pid;
}

// 删除 PID 文件
function removePidFile(): void {
  const pidPath = getPidFilePath();
  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath);
  }
}

// 检查进程是否在运行
function isProcessRunning(pid: number): boolean {
  try {
    // Node.js 方式检查进程是否存在
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

const program = new Command();

// 配置 init 子命令
program
  .command('emit-config')
  .description('在当前目录创建配置文件')
  .action(() => {
    const configContent = CONFIG_TEMPLATE

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
    // 检查是否已有服务在运行
    const existingPid = readPid();
    if (existingPid && isProcessRunning(existingPid)) {
      console.error(`❌ 服务已在运行中 (PID: ${existingPid})。请先停止后再启动。`);
      console.log('💡 使用 pcontext stop 停止服务');
      return;
    }

    const configPath = options.config;
    const port = options.port ? parseInt(options.port, 10) : undefined;
    const hostname = options.hostname;

    if (typeof configPath !== 'string') {
      console.error('❌ 错误：`start` 命令缺少必需的 `--config` 参数。');
      console.log('💡 用法示例: pcontext start --config ./pcontext.config.js');
      return;
    }
    // 基于当前pwd,解析出绝对路径
    const absoluteConfigPath = path.join(process.cwd(), configPath)
    console.log(`🚀 准备启动服务，使用配置路径: ${absoluteConfigPath}`);


    try {
      const config: PContextConfig = await loadSettingsConfig(absoluteConfigPath);
      await initApp()
      // 启动
      console.log('\n--- 启动配置详情 ---');
      console.log(config);
      console.log('----------------------');

      // 优先使用命令行传入的端口，否则使用配置文件中的端口
      const finalPort = port ?? config.port;
      await startServer(finalPort, hostname);

      // 保存 PID 文件
      savePid(process.pid);

      console.log(`✅ 服务已成功启动在 ${hostname}:${finalPort}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 启动失败，配置加载失败：${errorMessage}`);
      console.error(error);
    }
  });

// 配置 stop 子命令
program
  .command('stop')
  .description('停止正在运行的服务')
  .action(() => {
    const pid = readPid();

    if (!pid) {
      console.log('ℹ️ 没有找到 PID 文件，服务可能未运行。');
      return;
    }

    if (!isProcessRunning(pid)) {
      console.log('⚠️ 服务进程不存在或已停止运行，清理 PID 文件。');
      removePidFile();
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
      console.log(`✅ 已发送停止信号到服务 (PID: ${pid})`);
      removePidFile();
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : '未知错误';
      console.error(`❌ 停止服务失败: ${errorMessage}`);
    }
  });

// 配置 status 子命令
program
  .command('status')
  .description('查看服务运行状态')
  .action(() => {
    const pid = readPid();

    if (!pid) {
      console.log('ℹ️ 服务未运行 (未找到 PID 文件)');
      return;
    }

    const running = isProcessRunning(pid);

    if (running) {
      console.log(`✅ 服务正在运行 (PID: ${pid})`);
    } else {
      console.log(`⚠️ 服务已停止，但 PID 文件仍存在 (PID: ${pid})`);
      console.log('💡 清理过期的 PID 文件...');
      removePidFile();
    }
  });

// 解析命令行参数
program.parse(process.argv);
