import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { join } from 'path'

const dbPath = join(process.cwd(), 'data', 'dealvertical.db')
let _sqlite: Database.Database | null = null

function getSqlite() {
  if (!_sqlite) _sqlite = new Database(dbPath)
  return _sqlite
}

export function getDb() {
  return drizzle(getSqlite(), { schema })
}

export function getRawDb() {
  return getSqlite()
}

export * from './schema'
