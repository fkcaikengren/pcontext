import * as process from 'node:process'
import { getRepositories } from '../repositories/repo.factory.ts'
import pkg from '../../package.json'
import { createRouter } from '../lib/create-app'

const router = createRouter()

router.get('/', async (c) => {
  const startTime = Date.now()

  const { ping } = getRepositories()
  const ok = await ping()
  if (!ok) throw new Error('db ping failed')

  const responseTime = Date.now() - startTime

  return c.json({
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    version: pkg.version,
  })
})

router.get('/detailed', async (c) => {
  const checks = { database: false, memory: false, disk: false }

  try {
    const { ping } = getRepositories()
    const ok = await ping()
    if (!ok) throw new Error('db ping failed')
    checks.database = true
  }
  catch {
    checks.database = false
  }

  const memUsage = process.memoryUsage()
  checks.memory = memUsage.heapUsed < 500 * 1024 * 1024
  checks.disk = true

  const allHealthy = Object.values(checks).every(Boolean)

  return c.json({
    checks,
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    },
  }, allHealthy ? 200 : 503)
})

export default router
