process.env.DB_TYPE = process.env.DB_TYPE || 'sqlite'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:pcontext.db'

import { createDatabase } from '@/repositories/repo.factory'
import { createUser, updateSelf, updateUserById } from '@/services/user.service'

async function main() {
  const db = createDatabase()
  console.log('Provider:', db.provider)

  const username = `user_${Math.floor(Math.random() * 10000)}`
  const phone = `1${Math.floor(Math.random() * 1000000000)}`

  const created = await createUser({ username, password: 'pass', name: 'Test', phone })
  console.log('Created:', created)

  const listed = await db.userRepository.list(1, 10)
  console.log('List count:', listed.total)

  const updated = await updateUserById(created.id, { name: 'Updated' })
  console.log('Updated:', updated)

  const selfUpdated = await updateSelf(created.id, { password: 'newpass' })
  console.log('SelfUpdated:', selfUpdated)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

