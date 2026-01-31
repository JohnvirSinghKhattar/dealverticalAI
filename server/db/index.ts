import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

let _client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url) {
      throw new Error('TURSO_DATABASE_URL environment variable is not set')
    }

    _client = createClient({
      url,
      authToken,
    })
  }
  return _client
}

export function getDb() {
  return drizzle(getClient(), { schema })
}

export function getClient_() {
  return getClient()
}

export * from './schema'
