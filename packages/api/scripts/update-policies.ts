import { initEnforcer } from '@/infrastructure/casbin/enforcer'
import { initDb } from '@/infrastructure/db/connection'

async function main() {
  await initDb()
  const enforcer = await initEnforcer()
  
  // Clear existing policies to force re-seed or update
  // Since we don't have a clear method exposed easily without direct DB access,
  // we can use the enforcer API if supported by adapter.
  // Or we can just add the missing policies.
  
  const policies = [
    ['admin', '/api/*', '.*'],
    ['user', '/api/health', 'GET'],
    ['user', '/api/users', 'GET'],
    ['user', '/api/docs/add', 'POST'],
    ['user', '/api/docs/*/favorite', 'POST'],
    ['guest', '/api/health', 'GET'],
    ['guest', '/api/docs', 'GET'],
    ['guest', '/api/docs/*', 'GET'],
    ['guest', '/api/docs/*/check', 'POST'],
    ['guest', '/api/chat', 'POST'],
  ]

  for (const p of policies) {
    await enforcer.addPolicy(...p)
  }
  
  await enforcer.savePolicy()
  console.log('Policies updated')
}

main().catch(console.error)
