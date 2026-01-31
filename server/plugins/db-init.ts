import { getRawDb } from '../db'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

export default defineNitroPlugin(() => {
  const dataDir = join(process.cwd(), 'data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  const sqlite = getRawDb()
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT,
      file_path TEXT NOT NULL,
      manus_task_id TEXT,
      status TEXT NOT NULL DEFAULT 'uploaded',
      result_json TEXT,
      neighborhood_json TEXT,
      created_at INTEGER
    )
  `)
})
