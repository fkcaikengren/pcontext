#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📦 开始构建..."
echo ""
cd "$ROOT_DIR"

# 1. 构建 shared
echo "⚙️ 构建 shared..."
bun run --filter @pcontext/shared build
echo "✅ Shared 构建成功"
echo ""

# 2. 构建 api
echo "⚙️ 构建 api..."
bun run --filter @pcontext/api build
echo "✅ API 构建成功"
echo ""

# 3. 构建 server
echo "⚙️ 构建 server..."
bun run --filter @pcontext/server build
echo "✅ Server 构建成功"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "🎉 所有构建完成!"
echo "════════════════════════════════════════════════════════════"
