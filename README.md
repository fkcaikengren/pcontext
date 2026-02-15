# workspaces

本地开发：

1.docker启动milvus
```bash
# 启动
docker compose -f dev-compose.yml up -d
# 关闭
docker compose -f dev-compose.yml down

```

2.整个monorepo项目安装依赖
```bash
bun install
```

3.使用了bun和pnpm管理依赖，所以建议使用nr/ni 工具