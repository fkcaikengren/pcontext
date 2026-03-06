#!/bin/bash
set -e

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# server 目录
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
# 项目根目录
ROOT_DIR="$(dirname "$SERVER_DIR")"

echo "📦 开始构建..."
echo "  Server dir: $SERVER_DIR"
echo "  Root dir: $ROOT_DIR"

# 1. 构建 web 子项目
echo "⚙️ 构建 web 子项目..."
cd "$ROOT_DIR/web"
bun run build
echo "✅ Web 子项目构建成功"

# 2. 清空 dist 目录
echo "🧹 清空 dist 目录..."
rm -rf "$SERVER_DIR/dist"
mkdir -p "$SERVER_DIR/dist"

# 3. 执行 bun build
echo "⚙️ 执行 bun build..."
cd "$SERVER_DIR"
NODE_ENV=production bun build ./src/cli.ts \
  --format=esm \
  --target=node \
  --outdir=dist \
  --external @pcontext/shared \
  --external @pcontext/api \
  --external commander \
  --external @hono/node-server \
  --external hono/bun \
  --external hono/deno
echo "✅ Server 子项目构建成功"

# 4. 复制 web/build/client 到 dist/build/client
echo "📂 复制 web 静态资源到 dist..."
WEB_CLIENT_DIR="$ROOT_DIR/web/build/client"

if [ ! -d "$WEB_CLIENT_DIR" ]; then
  echo "❌ 错误: $WEB_CLIENT_DIR 不存在"
  echo "💡 请先运行 'bun run build:web' 构建 web 项目"
  exit 1
fi

mkdir -p "$SERVER_DIR/dist/build"
cp -r "$WEB_CLIENT_DIR" "$SERVER_DIR/dist/build/client"
echo "✅ 静态资源复制成功"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🎉 构建完成!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 总结步骤:"
echo "  1. ✅ Web 子项目构建完成"
echo "  2. ✅ Server 子项目构建完成"
echo "  3. ✅ 静态资源复制完成"
echo ""
echo "📁 输出目录: $SERVER_DIR/dist"
echo "🚀 可通过 'bun run start:bun' 启动服务"
  