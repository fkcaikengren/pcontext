---
name: packages/api  开发规范
description: packages/api 子项目的项目结构规范、代码规范和运行等操作规范。修改该子项目需要遵循这些规范。
---

## 数据库 
支持本地的SQLite数据库，也支持远程的Postgrel数据库。使用了 drizzle-orm 来控制数据库操作。


## 项目结构

```
my-app/
├── 📄 package.json
├── 📄 drizzle-pg.config.ts    # Drizzle Kit 配置文件 (Postgres 专用)
├── 📄 drizzle-sqlite.config.ts# Drizzle Kit 配置文件 (SQLite 专用)
│
└── 📂 src/
    ├── 📄 main.ts             # 应用入口
    │
    ├── 📂 domain/             # [核心层] 纯 TypeScript 类型定义 (不依赖 Drizzle)
    │   ├── 📄 user.entity.ts  # export interface User { ... }
    │   └── 📄 post.entity.ts
    │
    ├── 📂 services/           # [业务逻辑层] 只调用 Repository 接口
    │   └── 📄 user.service.ts # 业务逻辑，如：注册、验证，不含 SQL
    │
    ├── 📂 repositories/       # [仓储层] 定义接口和具体实现
    │   ├── 📄 IUserRepository.ts        # 接口定义 (Contract)
    │   │
    │   ├── 📂 impl/                     # 具体实现 (Adapters)
    │   │   ├── 📄 PgUserRepository.ts     # class PgUserRepository implements IUserRepository
    │   │   └── 📄 SqliteUserRepository.ts # class SqliteUserRepository implements IUserRepository
    │   │
    │   └── 📄 repo.factory.ts           # 工厂模式：根据配置返回对应的 Repo 实例
    │
    └── 📂 infrastructure/     # [基础设施层] 数据库连接与 Schema 定义
        └── 📂 db/
            ├── 📄 connection.ts         # 数据库连接初始化 (Client 实例化)
            │
            └── 📂 schemas/              # Drizzle Schema 定义
                ├── 📄 index.ts          # 统一导出
                ├── 📄 users.pg.ts       # pgTable 定义
                └── 📄 users.sqlite.ts   # sqliteTable 定义
```
1. src/domain/ (领域层)
这是整个应用的灵魂。这里定义的类型是“真理”。
作用：定义业务实体（Entity）。
规则：绝对不能 引入 drizzle-orm 的任何代码。只使用 TypeScript 原生类型（string, number, Date）。
示例：
code
TypeScript
// src/domain/user.entity.ts
export interface User {
  id: number;
  createdAt: Date; // 统一为 Date 对象，不管数据库存的是时间戳还是字符串
}
2. src/infrastructure/db/schemas/ (Schema 定义)
这里存放 Drizzle 的表定义。因为方言不同，必须物理隔离。
users.pg.ts: 使用 drizzle-orm/pg-core。
users.sqlite.ts: 使用 drizzle-orm/sqlite-core。
注意：虽然这里是两套代码，但字段名（key）最好保持一致，方便在 Repository 层做映射。
3. src/repositories/ (仓储适配器)
这是抹平差异的战场。
IUserRepository.ts: 制定标准。方法签名必须返回 Promise<User>（来自 domain）。
impl/PgUserRepository.ts:
引入 users.pg.ts。
实现 db.select().from(usersPg)...。
关键：无需特殊转换，PG 驱动通常自动处理 Date。
impl/SqliteUserRepository.ts:
引入 users.sqlite.ts。
实现 db.select().from(usersSqlite)...。
关键：必须处理数据清洗（Mapper），例如把 SQLite 读出来的 number (timestamp) new Date() 转换成 Domain 需要的 Date 对象。
4. src/infrastructure/db/connection.ts & repo.factory.ts
这是切换开关。
读取 .env 中的 DB_TYPE ('postgres' | 'sqlite')。
如果是 postgres，初始化 NodePgDatabase 并实例化 PgUserRepository。
如果是 sqlite，初始化 LibSQLDatabase 并实例化 SqliteUserRepository。
5. drizzle.config.*.ts (工程化配置)
因为 drizzle-kit（迁移工具）一次只能处理一种方言，建议拆分配置文件。
在 package.json 中配置不同的脚本：
code
JSON
"scripts": {
  "db:push:pg": "drizzle-kit push --config=drizzle.config.pg.ts",
  "db:push:sqlite": "drizzle-kit push --config=drizzle.config.sqlite.ts"
}
🧠 为什么这样设计？
依赖倒置原则 (DIP)：
Services -> IUserRepository (接口)
PgUserRepository -> IUserRepository (接口)
业务层不依赖数据库层，二者都依赖抽象接口。
单一职责：
Schema 负责定义表结构。
Repository 负责 SQL 组装和类型转换。
Service 负责业务逻辑。
可测试性：
编写单元测试时，你可以轻松 Mock 一个 MockUserRepository，而不需要真的启动一个 PostgreSQL 或 SQLite 数据库。