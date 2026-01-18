# Style & Conventions

## TypeScript
- ESM ("type": "module" across packages)
- Prefer type-safe boundaries (zod is present; hono zod validator is included at workspace level)

## Linting
- ESLint is configured (root uses @antfu/eslint-config; packages/api has eslint.config.mjs)

## Frontend (React)
- React 19 + React Router v7
- SPA code under packages/web/app (routes under app/routes)
- TailwindCSS + Radix UI component patterns (components under app/components/ui)

## Backend
- Hono routes under packages/api/src/routes
- DB layer under packages/api/src/infrastructure/db (schemas + migrations for pg/sqlite)
- Casbin adapters for pg/sqlite under packages/api/src/infrastructure/casbin
