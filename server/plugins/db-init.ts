import { getClient_ } from '../db'

export default defineNitroPlugin(async () => {
  const client = getClient_()
  await client.execute(`
    CREATE TABLE IF NOT EXISTS analyses (
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
})
