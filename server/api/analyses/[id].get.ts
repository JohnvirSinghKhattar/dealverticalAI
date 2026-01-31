import { getDb } from '../../db'
import { analyses } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = getDb()
  const [row] = await db.select().from(analyses).where(eq(analyses.id, Number(id)))
  if (!row) throw createError({ statusCode: 404, message: 'Analysis not found' })
  return {
    id: row.id,
    address: row.address,
    fileName: row.fileName,
    status: row.status,
    resultJson: row.resultJson ? JSON.parse(row.resultJson) : null,
    neighborhoodJson: row.neighborhoodJson ? JSON.parse(row.neighborhoodJson) : null,
    createdAt: row.createdAt,
  }
})
