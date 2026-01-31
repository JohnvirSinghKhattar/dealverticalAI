import { getDb, analyses } from '../../db'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = getDb()
  const rows = await db.select().from(analyses).orderBy(desc(analyses.createdAt)).limit(100)
  return rows.map((r) => ({
    id: r.id,
    address: r.address,
    status: r.status,
    createdAt: r.createdAt,
  }))
})
