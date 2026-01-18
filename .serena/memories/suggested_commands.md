# Suggested Commands (Bun workspace)

## Install
- bun install

## Dev (from repo root)
- bun run dev:server  # runs @pcontext/server dev (default server port 3000 in project rules)
- bun run dev:web     # runs @pcontext/chat-web dev (vite/react-router dev port 3001 in project rules)

## Package-specific (from repo root)
- bun run --filter @pcontext/api dev
- bun run --filter @pcontext/api build
- bun run --filter @pcontext/api lint
- bun run --filter @pcontext/api lint:fix
- bun run --filter @pcontext/api db:generate

- bun run --filter @pcontext/server dev
- bun run --filter @pcontext/server build

- bun run --filter @pcontext/chat-web dev
- bun run --filter @pcontext/chat-web build
- bun run --filter @pcontext/chat-web typecheck

## Commit
- bun run commit        # commitizen (git-cz)
- bun run commit:lint   # commitlint
