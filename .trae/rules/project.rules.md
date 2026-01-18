
## 项目架构
采用monorepo项目架构，使用bun作为包管理器。安装依赖请在项目根目录下执行`bun add <package-name>`。
项目结构如下：
```
|-packages
    |-api （基于hono开发的服务端，提供API）
    |-server （打包npm包，通过命令行启动api服务和提供网页等静态资源服务）
    |-web （基于react19 + react-router v7开发的SPA）

```

在开发阶段：
- 通过`bun run dev:api`运行服务运行在3000端口，提供api接口。
- 通过`bun run dev:web` web通过vite运行在3001端口，提供SPA网页。