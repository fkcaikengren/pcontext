import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/infrastructure/db/schemas/*.pg.ts',
  out: './src/infrastructure/db/migrations/pg',
  dialect: 'postgresql',
})

