import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [
        './packages/api/tsconfig.json',
        './packages/shared/tsconfig.json',
      ],
    }),
  ],
  test: {
    globals: true,
    // 1. **环境配置 (Environment)**
    // 指定测试运行环境为 'node'，这是 Node.js 后端程序所需的默认设置。
    environment: 'node',

    // 2. **文件匹配 (File Matching)**
    // Vitest 默认的 glob 模式，匹配所有以 .test., .spec. 结尾的文件，
    // 或在 __tests__ 目录下的文件。
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // 3. **报告和覆盖率 (Reporters & Coverage)**
    // 启用代码覆盖率收集。
    coverage: {
      enabled: true,
      // 使用 'v8' 引擎以获得更快的性能，或使用 'istanbul' 获得更广泛的兼容性。
      provider: 'v8', 
      // 指定覆盖率报告的输出目录
      
      // 指定要收集覆盖率的文件类型
      include: ['src/**/*.ts'],
      // 达到特定覆盖率阈值时测试失败（可选）
      // thresholds: {
      //   statements: 80,
      //   branches: 80,
      //   functions: 80,
      //   lines: 80,
      // },
    },

    // 4. **超时设置 (Timeout)**
    // 单个测试用例的默认超时时间（毫秒）。
    testTimeout: 5000, 
    // 钩子（如 beforeAll/afterAll）的默认超时时间（毫秒）。
    hookTimeout: 10000,


    // 启用对 'node_modules' 模块的自动模拟功能 (例如模拟 fs 或 path)。
    mockReset: true,
  },
});
