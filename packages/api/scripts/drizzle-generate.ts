import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const configs = [
  './drizzle-pg.config.ts',
  './drizzle-sqlite.config.ts',
]

async function getMigrationName() {
  const [, , argName] = process.argv
  if (argName && argName.trim()) return argName.trim()

  const rl = createInterface({ input, output })

  try {
    let name = ''
    while (!name.trim()) {
      name = await rl.question('请输入本次迁移名称（例如 add_users_table）：')
    }
    return name.trim()
  } finally {
    rl.close()
  }
}

async function run() {
  const migrationName = await getMigrationName()

  const processes = configs.map(config => Bun.spawn([
    'bunx',
    'drizzle-kit',
    'generate',
    `--config=${config}`,
    '--name',
    migrationName,
  ], {
    stdout: 'inherit',
    stderr: 'inherit',
  }))

  const exitCodes = await Promise.all(processes.map(proc => proc.exited))

  const failed = exitCodes.find(code => code !== 0)

  if (failed !== undefined && failed !== 0) {
    process.exit(failed)
  }
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
