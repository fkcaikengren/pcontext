
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 运行时环境判断，通过检查运行时独有的全局对象来确定当前环境是 Bun, Deno, Node.js 还是 其他。
 * 
 * @returns { 'bun' | 'deno' | 'node' | 'unknown' } 一个表示当前环境的字符串。
 */
export function getRuntime() {
    const globalContext = globalThis as any;

    // --- 1. 检查 Bun ---
    // Bun 具有全局的 Bun 对象。
    if (typeof globalContext.Bun !== 'undefined') {
        return 'bun';
    }

    // --- 2. 检查 Deno ---
    // Deno 具有全局的 Deno 对象。
    if (typeof globalContext.Deno !== 'undefined') {
        return 'deno';
    }

    // --- 3. 检查 Node.js ---
    // Node.js 具有全局的 process 对象，并且通常该对象的 versions 属性包含 node 版本信息。
    if (
        typeof globalContext.process !== 'undefined' && 
        globalContext.process.versions != null && 
        globalContext.process.versions.node != null
    ) {
        return 'node';
    }

    // --- 4. 未知环境 ---
    // 其他运行时（browser, worker, cloudflare-worker）
    return 'unknown';
}



/**
 * 通过import.meta.url获取当前文件所在的目录的绝对路径 (__dirname)
 */
export function getDirname(fileUrl:string) {
    if (typeof fileUrl === 'string') {
        const __filename = fileURLToPath(fileUrl);
        return path.dirname(__filename);
    }
    return '';
}
