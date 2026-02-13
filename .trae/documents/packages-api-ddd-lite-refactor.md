## 目标与新增约束
- 按 DDD-Lite 重构为 `src/modules/{doc,user,task}` + `src/shared`。
- 重要约束：不再使用 `shared/db/schemas/**` 这种集中式 schema 目录；改为每个模块各自维护一个 `xx.po.ts`（Drizzle 表定义 = PO）。
- 新增需求：`task` 模块增加一张任务表，必须包含“任务类型”和“关联资源 id（并建索引）”，可不设外键。

## 结构落地（调整后）
- `src/modules/doc/`
  - `doc.po.ts`：Drizzle 表定义（同时导出 pg/sqlite 版本的 table）
  - `doc.entity.ts`：Domain Entity（不含 zod）
  - `doc.dto.ts`：请求入参 zod schema + infer types（同时替代当前漂移的 `@/types/schemas/doc`）
  - `doc.vo.ts`
  - `doc.repo.interface.ts`
  - `doc.service.ts`
  - `doc.route.ts`
  - `infrastructure/agent/**`（迁入）
  - `infrastructure/chat/**`（把原 chat 并入 doc 模块，但 server 仍挂 `/chat`）

- `src/modules/user/`
  - `user.po.ts`：用户表 PO（pg/sqlite 两套 table）
  - `casbin-rule.po.ts`：casbin_rule 表 PO（pg/sqlite 两套 table；表也归 user 模块）
  - `user.entity.ts` / `user.dto.ts` / `user.vo.ts`
  - `user.repo.interface.ts` + pg/sqlite repo impl
  - `infrastructure/casbin/**`：adapter/enforcer
  - routes：`user.route.ts` + `admin/user.route.ts` + `admin/role.route.ts`

- `src/modules/task/`
  - `task.po.ts`：任务表 PO（pg/sqlite 两套 table；包含 type/resourceId 索引）
  - `task.entity.ts`（如需要：TaskStatus/TaskType 等）
  - `task.service.ts`
  - `task.route.ts`
  - `infrastructure/log-task/**`（迁入）

- `src/shared/`
  - `db/connection.ts`：只负责初始化 Drizzle client，并从各模块的 `*.po.ts` 组装 schema
  - `db/bootstrap.ts`：migrations/seed；更新 migrationsFolder 指向新的目录
  - `db/migrations/{pg,sqlite}/**`：迁移文件统一仍放这里（但来源 schema 来自各模块 po）
  - `middleware/**`：jwt/http-logger/limiter/authorization
  - `utils/**`：validator/response-template/errorHandler/url/pagination/user 等
  - `logger.ts`、`types.ts`、`create-app.ts`
  - `deps.ts`：统一依赖容器（RepoDeps/AppDeps）

## 统一依赖容器（RepoDeps / AppDeps）
- `src/shared/deps.ts`
  - `RepoDeps`：`{ provider; userRepo; docRepo; taskRepo; ping }`
  - `AppDeps`：在 `RepoDeps` 基础上补齐 `taskManager`（日志任务流）、`getEnforcer`（RBAC）、doc 的 `agent` 入口
  - `getRepoDeps()`：吸收现有 `repo.factory.ts` 的 provider 分流与缓存逻辑，并增加 taskRepo
  - 所有 module service 通过 deps 获取 repo/基础设施，不再直接依赖旧 `repositories/*`

## 任务表设计（满足“类型 + 关联资源 id（索引）”）
- 表名建议：`task`（或 `job_task`，最终以现有命名习惯为准）
- 字段（最小闭包）：
  - `id`（自增/uuid，按当前数据库习惯）
  - `type`（任务类型，如 `doc_index_git` 等）
  - `resourceId`（关联资源 id：例如 doc 的 slug；对其建立索引）
  - `status`（running/completed/failed，可选但推荐）
  - `createdAt/updatedAt`（可选但推荐）
- 索引：
  - `index(task.resourceId)` 必须
  - 可选复合索引：`(type, resourceId)` 方便同资源多任务查询

## 迁移步骤（按可编译闭包推进）
1) 先建 shared 骨架并迁移公共代码
- `lib/*` → `shared/*`，`middlewares/*` → `shared/middleware/*`，`utils/*` → `shared/utils/*`。
- 补齐/收口缺失类型文件：为 `routes/*` 与 `client.ts` 提供稳定的 `src/types.ts`（或由 `shared/types.ts` 再 re-export）。

2) DB 重构（去 schemas 目录，改用模块 po）
- `infrastructure/db` → `shared/db`。
- 将原 `infrastructure/db/schemas/*.pg.ts|*.sqlite.ts` 的表定义内容迁移为：
  - doc：`modules/doc/doc.po.ts`
  - user：`modules/user/user.po.ts`
  - casbin：`modules/user/casbin-rule.po.ts`
  - 新增 task：`modules/task/task.po.ts`
- 更新 `shared/db/connection.ts`：从各模块 `*.po.ts` 组装 pg/sqlite schema（保持当前 drizzle typed schema 体验）。
- 更新 `shared/db/bootstrap.ts`：migrationsFolder 指向 `./src/shared/db/migrations/{pg,sqlite}`。

3) task 模块落地（含“任务表”）
- `infrastructure/log-task` → `modules/task/infrastructure/log-task`。
- `services/task.service.ts` → `modules/task/task.service.ts`。
- `routes/task.route.ts` → `modules/task/task.route.ts`。
- 新建 `task.repo.interface.ts` + pg/sqlite repo，实现任务表 CRUD（至少 create/find/listByResource）。

4) user 模块 + casbin 并入
- 迁移 user routes/services/repos 到 `modules/user`；把 `domain/user.entity.ts` 中的 zod 拆到 `user.dto.ts`。
- casbin adapter/enforcer 迁到 `modules/user/infrastructure/casbin`，并将 casbin_rule 表 PO 放在 `modules/user/casbin-rule.po.ts`。
- `shared/middleware/authorization.ts` 改为通过 deps 调用 `getEnforcer()`（避免硬编码旧路径）。

5) doc 模块 + chat 合并
- 迁移 doc route/service/repo 到 `modules/doc`，用 `doc.dto.ts` 替代当前漂移 import。
- `infrastructure/agent` 迁入 `modules/doc/infrastructure/agent`。
- `chat.service.ts`/`chat.route.ts` 合并到 doc 模块中（server 仍 `.route('/chat', ...)`，对外 API 不变）。

6) server.ts 装配收口 + 删除旧目录
- 更新 [server.ts](file:///home/ubuntu/workspace/myprojects/ts/pcontext/packages/api/src/server.ts#L1-L39) import：改从 modules/shared 引入。
- 删除/弃用旧 `routes/services/repositories/infrastructure/lib/middlewares/utils/domain` 中已迁移文件。
- 更新 drizzle configs（`drizzle-*.config.ts`）的 schema 与 migrations 路径。

## 验证与回归
- 编译：确保 `bun run build` 通过。
- 启动：`bun run dev` 可启动并完成 initDb/bootstrap/initEnforcer/initSettings。
- API：检查 `/docs`、`/users`、`/tasks`、`/chat` 路由仍可访问（路径不变）。
- 迁移：sqlite/pg migrations 能应用；task 表在两种 provider 下都能创建并具备 resourceId 索引。

## 交付物
- 新 `modules/{doc,user,task}`（每模块一个 `xx.po.ts`）+ 新 `shared/**`
- 新增 task 表与对应 repo/service/route 适配
- 全量 imports/装配更新到新结构，清理旧目录