import { getClient_ } from '../db'

export default defineNitroPlugin(async () => {
  try {
    const client = getClient_()
    
    // Check if table exists with old schema (file_path) or needs creation
    const tableInfo = await client.execute(`PRAGMA table_info(analyses)`)
    const columns = tableInfo.rows.map((row) => row[1] as string)
    
    if (columns.length === 0) {
      // Table doesn't exist, create with new schema
      await client.execute(`
        CREATE TABLE analyses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          address TEXT,
          file_name TEXT NOT NULL,
          file_data TEXT NOT NULL,
          manus_task_id TEXT,
          status TEXT NOT NULL DEFAULT 'uploaded',
          result_json TEXT,
          neighborhood_json TEXT,
          created_at INTEGER
        )
      `)
      console.log('[DB] Created new analyses table')
    } else if (columns.includes('file_path') && !columns.includes('file_name')) {
      // Old schema detected, migrate to new schema
      console.log('[DB] Migrating from old schema to new schema...')
      await client.execute(`ALTER TABLE analyses RENAME TO analyses_old`)
      await client.execute(`
        CREATE TABLE analyses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          address TEXT,
          file_name TEXT NOT NULL,
          file_data TEXT NOT NULL,
          manus_task_id TEXT,
          status TEXT NOT NULL DEFAULT 'uploaded',
          result_json TEXT,
          neighborhood_json TEXT,
          created_at INTEGER
        )
      `)
      // Old data can't be migrated (no file_data), so we start fresh
      await client.execute(`DROP TABLE analyses_old`)
      console.log('[DB] Migration complete - old data cleared (incompatible schema)')
    } else {
      console.log('[DB] Database schema is up to date')
    }
  } catch (error) {
    console.error('[DB] Database initialization failed:', error)
    throw error
  }
})
