import type { UpdatableAdapter } from 'casbin'
import { getDbProvider, getPgDb, getSqliteDb } from '@/infrastructure/db/connection'
import { PgCasbinAdapter } from './adapter.pg'
import { SqliteCasbinAdapter } from './adapter.sqlite'

export function getCasbinAdapter(): UpdatableAdapter {
  const provider = getDbProvider()
  if (provider === 'postgresql') {
    return new PgCasbinAdapter(getPgDb())
  }
  return new SqliteCasbinAdapter(getSqliteDb())
}
