// src/index.ts

import parseArgs from 'minimist';
import fs from 'node:fs';
import path from 'node:path'; 
import { loadPContextConfig, PContextConfig } from '@pcontext/shared';

// 默认配置文件的名称
const DEFAULT_CONFIG_NAME = 'pcontext.config.js';

// 解析命令行参数并断言其类型，特别是针对自定义的 'config' 选项
const argv = parseArgs(process.argv.slice(2));

// 第一个非选项参数即为子命令
const command: string | undefined = argv._[0];

/**
 * 1. init 子命令：在当前目录创建配置文件
 */
function handleInit(): void {
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
        // 使用类型守卫确保错误对象具有 message 属性
        const errorMessage = (error instanceof Error) ? error.message : "未知错误";
        console.error(`❌ 创建文件失败: ${errorMessage}`);
    }
}

/**
 * 2. start 子命令：加载并使用配置文件
 */
async function handleStart(): Promise<void> {
    // TypeScript 帮助我们确定 config 的类型是 string | undefined
    const configPath: string | undefined = argv.config;

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
}

// 主命令分发逻辑
switch (command) {
    case 'init':
        console.log('--- 运行 init 命令 ---');
        handleInit();
        break;

    case 'start':
        console.log('--- 运行 start 命令 ---');
        await handleStart();
        break;

    default:
        console.log('❓ 未知命令或缺少子命令。');
        console.log('💡 可用命令：');
        console.log('  - init: 在当前目录创建一个 pcontext.config.js');
        console.log('  - start --config <path>: 使用指定的配置文件路径启动服务');
        break;
}
