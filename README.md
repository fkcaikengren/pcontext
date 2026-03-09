# PContext

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.2-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D22.0.0-yellow" alt="Node">
  <img src="https://img.shields.io/badge/bun-latest-orange" alt="Bun">
</p>

> English | [中文](./README.md)

## 介绍

PContext 是一个开源的可以私有部署的知识库系统，基于 [Model Context Protocol（MCP）](https://modelcontextprotocol.io/)，专门为 AI 编程助手提供实时的最新技术文档和代码示例。旨在通过从官方源实时获取文档并注入到 AI 提示上下文中，解决大语言模型因训练数据滞后导致的"代码幻觉"问题。

### 特性

- **MCP 协议支持**：完整实现 Model Context Protocol，可与 Claude、Cursor、Windsurf 等 AI 助手无缝集成
- **RAG 向量检索**：基于 Milvus 向量数据库 + LlamaIndex 实现高效的语义搜索
- **文档实时同步**：支持从官方文档源（GitHub、VitePress 等）自动抓取和更新文档
- **AI 对话界面**：提供 Web UI，可直接与 AI 助手交互查询知识库
- **灵活的部署方案**：支持 Docker 一键部署或 CLI 手动部署

### 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 19 + React Router v7 + Tailwind CSS |
| 后端 | Hono + Drizzle ORM + Zod + LlamaIndex |
| 向量库 | Milvus |
| 数据库 | PostgreSQL/SQLite + Redis |
| MCP | @modelcontextprotocol/sdk |
| 包管理 | Bun (Monorepo) |

### 项目架构

```
pcontext/
├── packages/
│   ├── api/          # 后端 API 服务 (Hono)
│   ├── web/          # 前端 Web 应用 (React 19)
│   ├── server/       # CLI 部署工具
│   └── shared/       # 共享类型和工具函数
└── dev-compose.yml   # 开发环境 Docker 配置
```

## 快速开始

### 1. 启动依赖服务

```bash
# 启动 Milvus、Redis 等依赖服务
docker compose -f dev-compose.yml up -d

# 等待服务启动完成后，访问 Milvus 管理界面
# http://localhost:8000
```

### 2. 安装依赖

```bash
# 安装 monorepo 所有依赖
bun install
```

### 3. 初始化配置

```bash
# 生成默认配置文件，会在 packages/server/ 目录下生成 pcontext.config.js
bun run init

# 将配置文件移动到项目根目录并重命名
mv packages/server/pcontext.config.js ./pcontext.config.local.js
```

### 4. 启动开发服务

```bash
# 启动 API 服务 (端口 3000)
bun run dev:api

# 启动 Web 服务 (端口 3001)
bun run dev:web
```

服务启动后：
- Web UI: http://localhost:3001
- API: http://localhost:3000

## 部署

### Docker 一键部署（推荐）

```bash
# 克隆项目
git clone https://github.com/fkcaikengren/pcontext.git
cd pcontext

# 使用 Docker Compose 部署
docker compose up -d
```

### CLI 手动部署

#### 1. 安装中间件依赖

确保已安装 Milvus 和 Redis。建议从 `dev-compose.yml` 拷贝一份配置使用 docker-compose 编排安装启动：

```bash
# 拷贝 docker-compose 配置
cp dev-compose.yml docker-compose.yml

# 启动中间件服务
docker-compose up -d
```

#### 2. 安装并启动服务

```bash
# 全局安装
npm install -g @pcontext/server
# 或
bun add -g @pcontext/server

# 初始化配置（会在当前目录生成 pcontext.config.js）
pcontext init

# 启动服务
pcontext start --config ./pcontext.config.js
```


**pcontext CLI 命令**

| 命令 | 说明 |
|------|------|
| `pcontext emit-config` | 在当前目录创建配置文件 (pcontext.config.js) |
| `pcontext start -c <path>` | 使用指定的配置文件路径启动服务 |
| `pcontext stop` | 停止正在运行的服务 |
| `pcontext status` | 查看服务运行状态 |




## MCP 集成

### 在Code Agent中安装


#### Cursor

在 `Cursor` 中添加 MCP 配置：

```json
{
  "mcpServers": {
    "pcontext": {
      "url": "https://your_deploy_domain.com/mcp",
      "headers": {
        "PCONTEXT_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

#### Claude Code

在 `~/.claude/mcp_settings.json` 中添加：

```json
{
  "mcpServers": {
    "pcontext": {
      "url": "https://your_deploy_domain.com/mcp",
      "headers": {
        "PCONTEXT_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

#### OpenCode

在 `OpenCode` 中添加 MCP 配置：

```json
{
  "mcpServers": {
    "pcontext": {
      "url": "https://your_deploy_domain.com/mcp",
      "headers": {
        "PCONTEXT_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

#### Trae

在 `Trae` 中添加 MCP 配置：

```json
{
  "mcpServers": {
    "pcontext": {
      "url": "https://your_deploy_domain.com/mcp",
      "headers": {
        "PCONTEXT_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

> **注意**：
> - 请将 `your_deploy_domain.com` 替换为实际部署的域名
> - 请将 `YOUR_API_KEY` 替换为实际的 API Key


### 小技巧 - 添加 Rule

为了避免在每次提示中手动输入使用 PContext，你可以添加一条规则到你的 MCP 客户端，让它自动为代码相关问题调用 PContext：

- **Cursor**: Cursor Settings > Rules
- **Claude Code**: CLAUDE.md
- 或你使用的 MCP 客户端的对应设置

示例规则：

```
Always use PContext MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
```
或者中文版：
```
当我需要库/API文档、代码生成、设置或配置步骤时，无需我明确询问，自动使用 PContext MCP。
```

### 可用工具

pcontext MCP 提供以下工具供 LLM 使用：

**resolve-library-id**: 根据包/库名称解析为 PContext 兼容的库 ID 并返回匹配的库。

- `query` (required): 用户的原始问题或任务（用于按相关性对结果进行排名）
- `libraryName` (required): 要搜索的库名称，以检索 PContext 兼容的库 ID

**query-docs**: 使用 PContext 兼容的库 ID 检索库的文档和代码示例。

- `libraryId` (required): 确切的 PContext 兼容库 ID（例如 'hono_docs'）
- `query` (required): 需要帮助的问题或任务（例如 '如何使用hono rpc ?'）
## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
