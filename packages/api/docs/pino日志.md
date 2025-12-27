这是一个基于 **Express + Pino** 的企业级日志设计方案。

核心设计理念：**高性能 (Zero-cost abstraction)、上下文贯通 (Context Awareness)、安全脱敏 (Redaction)、环境隔离 (Dev/Prod)**。

---

### 1. 项目目录结构设计 (Project Structure)

建议将日志模块封装为一个独立的 Infrastructure 组件，而不是简单的工具函数。

```text
src/
├── config/
│   └── logger.config.js       # 日志配置文件 (日志级别、脱敏字段、应用名称等)
│
├── infrastructure/            # 基础设施层
│   └── logger/                # Pino 封装模块
│       ├── index.js           # 入口：导出单例 Logger 实例
│       ├── serializers.js     # 序列化器：定义 req, res, err 的标准格式
│       ├── transports.js      # 传输层：定义日志输出目的地 (Console, File, Logstash等)
│       └── context.js         # 上下文追踪：基于 AsyncLocalStorage 存储 TraceID
│
├── middlewares/
│   └── httpLogger.js          # HTTP 请求日志中间件 (基于 pino-http)
│
├── utils/
│   └── error.js               # 统一错误处理，确保 Error 对象能被 Logger 正确解析
│
├── app.js                     # 应用入口，挂载中间件
└── ...
```

---

### 2. 模块职责详解

#### A. `config/logger.config.js` (配置中心)
*   **职责**：管理不同环境下的行为差异。
*   **设计要点**：
    *   **Log Level**：生产环境 `info`，开发环境 `debug` 或 `trace`。
    *   **Redaction (脱敏)**：定义敏感字段列表（如 `req.headers.authorization`, `password`, `email`），防止敏感数据泄露。
    *   **Enabled**：测试环境可能需要关闭日志。

#### B. `infrastructure/logger/serializers.js` (数据标准化)
*   **职责**：清洗和标准化日志对象。
*   **设计要点**：
    *   **req**：只保留 method, url, query, params, remoteIP, traceId。
    *   **res**：保留 statusCode, responseTime。
    *   **err**：确保堆栈信息 (stack trace) 被记录，且格式统一。

#### C. `infrastructure/logger/transports.js` (输出管道)
*   **职责**：决定日志去哪里。
*   **设计要点**：
    *   **Development**：使用 `pino-pretty` 进行美化输出，方便人类阅读。
    *   **Production**：
        *   **主要策略**：直接输出到 `stdout/stderr` (标准输出)，由 PM2、Docker 或 K8s 的日志收集器 (Filebeat/Fluentd) 抓取。这是 Node.js 性能最高的做法。
        *   **备选策略**：如果必须写文件，使用 `pino/file` 或 `pino-roll` (由于性能原因，应放在 Worker 线程中运行)。

#### D. `infrastructure/logger/context.js` (全链路追踪)
*   **职责**：解决“如何在 Service 层打印日志时带上 Request ID”的问题。
*   **设计要点**：
    *   使用 Node.js 原生的 `AsyncLocalStorage`。
    *   在中间件层生成唯一的 `traceId` (或 `correlationId`) 并存入 Store。
    *   封装 logger 的方法 (info, error)，自动从 Store 中取出 `traceId` 合并到日志对象中。
    *   **效果**：即使在深层 Service 调用 `logger.info('db connected')`，输出的 JSON 也会自动包含 `{"traceId": "abc-123", ...}`。

#### E. `middlewares/httpLogger.js` (接入层)
*   **职责**：自动记录所有 API 请求。
*   **设计要点**：
    *   使用 `pino-http`。
    *   **挂载 ID**：将生成的 UUID 挂载到 `req.id`。
    *   **静默处理**：配置 `autoLogging: false` 针对健康检查 (`/health`) 接口，避免日志刷屏。
    *   **响应时长**：自动记录 `responseTime`。

---

### 3. 日志分级与记录策略

| 级别 | 场景 | 包含内容 | 输出目标 |
| :--- | :--- | :--- | :--- |
| **FATAL** | 应用无法启动或崩溃 | 进程退出原因、未捕获的异常 | 报警系统 + 文件 |
| **ERROR** | 业务逻辑失败 (5xx) | Stack Trace、Request Body、TraceID | 错误监控 (Sentry) + 文件 |
| **WARN** | 非预期但可恢复 (4xx) | 参数校验失败、废弃接口调用 | 文件/控制台 |
| **INFO** | 关键流程节点 | 接口请求/响应、定时任务开始/结束 | 文件/控制台 (Elasticsearch) |
| **DEBUG** | 开发调试 | 完整的 SQL 语句、内部状态变化 | 开发环境控制台 |

---

### 4. 数据流向设计 (Data Flow)

1.  **Request 进入** -> `middlewares/httpLogger` 生成 `traceId`。
2.  **Context 绑定** -> `traceId` 存入 `AsyncLocalStorage`。
3.  **Controller/Service 业务处理** -> 调用 `logger.info('User created')`。
4.  **Logger 内部** ->
    *   获取当前 Context 中的 `traceId`。
    *   结合 `serializers` 清洗数据。
    *   根据 `config` 进行敏感字段脱敏 (Redact)。
5.  **Output** ->
    *   Dev: 格式化文本 -> Console。
    *   Prod: JSON 字符串 -> Stdout -> Log Collector (如 Logstash) -> Elasticsearch。

### 5. 生产环境最佳实践 (Ops)

1.  **不要在 Node 主线程写文件**：
    千万不要在 `transports.js` 里直接用 `fs.appendFile`。如果必须写本地文件，请使用 `pino.transport({ target: 'pino/file', worker: { autoEnd: false } })` 开启 Worker 线程写入。
2.  **JSON 优先**：
    生产环境必须输出 JSON 格式，便于 ELK (Elasticsearch, Logstash, Kibana) 或 Datadog 解析。
3.  **采样率 (可选)**：
    如果 QPS 极高，可以在 `httpLogger` 中设置采样逻辑，只记录 10% 的 `INFO` 级别请求日志，但记录 100% 的 `ERROR` 日志。