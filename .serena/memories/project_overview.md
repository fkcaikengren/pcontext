# pcontext (monorepo)

## Purpose
- A Bun-based TypeScript monorepo that provides:
  - API service (Hono) for docs/RAG chat/admin capabilities
  - A server package that runs the API and serves static web assets
  - A React 19 + React Router v7 SPA (chat-web)

## Tech Stack
- Runtime/package manager: Bun (workspace)
- Backend API: Hono
- Auth/ACL: JWT middleware + Casbin (adapters for Postgres/SQLite)
- DB/ORM: Drizzle ORM + drizzle-kit; supports PostgreSQL and SQLite
- Vector/RAG: LlamaIndex + Milvus
- Frontend: React 19 + React Router v7, TailwindCSS, Radix UI
- Testing: Vitest (repo-level); additional API integration tests exist under packages/api/tests

## Repository Structure
- packages/api: Hono API service, DB schemas/migrations, middlewares, routes, services
- packages/server: CLI/server wrapper to run API and serve static assets
- packages/shared: shared config/types/utils (includes pcontext.config.js)
- packages/web (name: @pcontext/chat-web): SPA app (routes under app/routes)
