## 变更点（按你最新要求修订）
- `schemas/**` 不再作为集中目录存在；每个模块在自己的 `infrastructure/` 下提供 `xx.po.ts`：
  - 同一个业务概念 = 1 个 Entity
  - 但需要 2 套 Drizzle table/PO（pg + sqlite），都放在同一个 `xx.po.ts` 中导出
- 每个模块的 `infrastructure/` 里还要包含：`xxx.repo.pg.ts`、`xxx.repo.sqlite.ts`（Drizzle 推断类型作为 PO；Repo 内做 PO→Entity 映射）
- task 模块新增一张任务表：必须含任务类型 + 关联资源 id（建索引），可不设外键。

## 目录结构（最终形态）
- `src/modules/doc/`
  - `doc.entity.ts`
  - `doc.vo.ts`
  - `doc.dto.ts`（zod + infer，替代当前漂移的 `@/types/schemas/doc`）
  - `doc.repo.interface.ts`
  - `doc.service.ts`（从统一依赖容器取 repo/agent/taskManager）
  - `doc.route.ts`
  - `infrastructure/`
    - `doc.po.ts`（导出 `docPgTable` / `docSqliteTable` + 对应 PO 类型）
    - `doc.repo.pg.ts`
    - `doc.repo.sqlite.ts`
    - `agent/**`（从原 `src/infrastructure/agent` 迁入）
    - `chat/**`（把原 chat 合并为 doc 模块内部实现；server 仍挂 `/chat`）

- `src/modules/user/`
  - `user.entity.ts`（纯领域模型，不含 zod）
  - `user.vo.ts`
  - `user.dto.ts`（zod + infer）
  - `user.repo.interface.ts`
  - `user.service.ts`
  - `user.route.ts` + `admin/user.route.ts` + `admin/role.route.ts`
  - `infrastructure/`
    - `user.po.ts`（pg/sqlite 两套 user table）
    - `casbin-rule.po.ts`（pg/sqlite 两套 casbin_rule table）
    - `user.repo.pg.ts` / `user.repo.sqlite.ts`
    - `casbin/adapter.pg.ts` / `adapter.sqlite.ts` / `adapter.ts` / `enforcer.ts`

- `src/modules/task/`
  - `task.entity.ts`（TaskType/TaskStatus 等领域枚举/类型）
  - `task.repo.interface.ts`
  - `task.service.ts`（TaskManager + DB taskRepo：创建/更新状态/查询）
  - `task.route.ts`
  - `infrastructure/`
    - `task.po.ts`（pg/sqlite 两套 task table；含 resourceId 索引）
    - `task.repo.pg.ts` / `task.repo.sqlite.ts`
    - `log-task/**`（从原 `src/infrastructure/log-task` 迁入）

- `src/shared/`
  - `create-app.ts`（原 `lib/create-app.ts`）
  - `logger.ts`、`types.ts`
  - `middleware/**`（jwt/http-logger/authorization/limiter）
  - `utils/**`（validator/response-template/errorHandler/url/pagination/user/date/format 等）
  - `db/`
    - `connection.ts`（初始化 Drizzle；从各模块 `*.po.ts` 组装 schema）
    - `bootstrap.ts`（migrations/seed；更新 migrationsFolder 路径）
    - `migrations/{pg,sqlite}/**`（保留两套迁移目录）
  - `deps.ts`（统一依赖容器：RepoDeps/AppDeps）

## 统一依赖容器（RepoDeps/AppDeps）
- 新增 `src/shared/deps.ts`：
  - `getRepoDeps()`：按 provider（pg/sqlite）构造 `userRepo/docRepo/taskRepo`，并缓存
  - `getAppDeps()`：在 repo deps 上追加 `taskManager`、`getEnforcer()`、doc agent 入口
- 模块 service 只从 deps 获取 repo/基础设施，避免跨模块直接 import 旧目录。

## task 表设计（满足必选字段 + 索引）
- 表名：`task`
- 必选字段：
  - `id`
  - `type`（任务类型，string 或 enum 形式存储）
  - `resourceId`（关联资源 id，例如 doc.slug；必须建索引）
- 推荐字段（用于状态可追踪）：
  - `status`（running|completed|failed）
  - `message`/`meta`（可选，存储错误或上下文）
  - `createdAt`/`updatedAt`
- 索引：
  - `index(resourceId)` 必须
  - 可选：`index(type, resourceId)` 便于同资源同类型查询

## 迁移执行顺序（保证每步可编译）
1) shared 层迁移与缺失引用收口
- `lib/*`→`shared/*`，`middlewares/*`→`shared/middleware/*`，`utils/*`→`shared/utils/*`
- 补齐 `src/types.ts` 的稳定出口（供 client/route 使用），避免当前缺文件问题

2) DB 重构（去 schemas 目录，改模块 po）
- `src/infrastructure/db`→`src/shared/db`
- 把原 `infrastructure/db/schemas/*.{pg,sqlite}.ts` 内容分流到：
  - doc：`modules/doc/infrastructure/doc.po.ts`
  - user：`modules/user/infrastructure/user.po.ts`
  - casbin：`modules/user/infrastructure/casbin-rule.po.ts`
  - task：`modules/task/infrastructure/task.po.ts`（新建）
- 更新 `shared/db/connection.ts` 的 schema 组装来源为各模块 `*.po.ts`

3) task 模块落地（含任务表 + repo）
- `log-task` 迁入 `modules/task/infrastructure/log-task`
- 新建 task repo 接口 + pg/sqlite repo，实现 task 表读写
- 调整现 `/tasks` SSE 路由使用新 task 模块 service

4) user 模块落地（casbin 全并入）
- user routes/services/repos 迁入模块
- casbin adapter/enforcer + casbin_rule.po.ts 全部归 user 模块
- `shared/middleware/authorization.ts` 改为通过 deps 获取 enforcer

5) doc 模块落地（chat 并入 doc）
- doc routes/services/repos 迁入模块，并用 `doc.dto.ts` 替代漂移 schema import
- agent 迁入 `modules/doc/infrastructure/agent`
- chat handler/route 迁入 doc 模块内部实现，但 server 仍挂 `/chat`

6) server/drizzle 配置更新 + 清理旧目录 + 回归验证
- `server.ts` 只从 `shared` 和 `modules/*` 引入装配点
- 更新 `drizzle-*.config.ts` 的 schema/migrations 路径
- 删除旧 `routes/services/repositories/infrastructure/lib/middlewares/utils/domain` 中已迁移内容
- 验证：build + dev 启动 + 核心路由路径不变 + migrations 可跑 + RBAC/CSRF 行为一致