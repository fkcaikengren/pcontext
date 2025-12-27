import { defineConfig } from 'drizzle-kit'


export default defineConfig({
  schema: './src/infrastructure/db/schemas/*.sqlite.ts',
  out: './src/infrastructure/db/migrations/sqlite',
  dialect: 'sqlite',
})

