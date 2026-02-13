import { defineConfig } from 'drizzle-kit'


export default defineConfig({
  schema: './src/modules/**/infrastructure/*.sqlite.po.ts',
  out: './src/shared/db/migrations/sqlite',
  dialect: 'sqlite',
})
