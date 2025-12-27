import { createClient } from '@libsql/client'
import AppSettings from '@/settings'

const { config } = AppSettings
const client = createClient({ url: 'file:./pcontext.db' })

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `)

  // await client.execute(`
  //   CREATE TABLE IF NOT EXISTS casbin_rule (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     ptype TEXT,
  //     v0 TEXT,
  //     v1 TEXT,
  //     v2 TEXT,
  //     v3 TEXT,
  //     v4 TEXT,
  //     v5 TEXT
  //   )
  // `)

  console.log('SQLite tables ensured: user, casbin_rule')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
