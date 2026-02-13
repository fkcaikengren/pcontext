import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/modules/**/infrastructure/*.pg.po.ts',
  out: './src/shared/db/migrations/pg',
  dialect: 'postgresql',
})
