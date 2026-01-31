import { getDb } from '../../db'
import { analyses } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const db = getDb()
  
  // Check if analysis exists
  const [row] = await db.select().from(analyses).where(eq(analyses.id, Number(id)))
  if (!row) throw createError({ statusCode: 404, message: 'Analysis not found' })

  // Delete the analysis
  await db.delete(analyses).where(eq(analyses.id, Number(id)))

  return { success: true, message: 'Analysis deleted' }
})
