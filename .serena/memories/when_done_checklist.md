# When a Task Is Done (Checklist)

- Run relevant tests (Vitest at repo level if applicable; API tests under packages/api/tests)
- Run lint for affected packages (e.g., @pcontext/api: `bun run --filter @pcontext/api lint`)
- Run type checks for web (`bun run --filter @pcontext/chat-web typecheck`) when frontend changes
- Verify dev flows:
  - Server dev: `bun run dev:server`
  - Web dev: `bun run dev:web`
