import { getDb } from '../../../db'
import { analyses } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { getTaskResult } from '../../../utils/manus'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const config = useRuntimeConfig()
  const db = getDb()

  const [row] = await db.select().from(analyses).where(eq(analyses.id, Number(id)))
  if (!row) throw createError({ statusCode: 404, message: 'Analysis not found' })
  if (row.status === 'completed') {
    return {
      status: 'completed',
      resultJson: row.resultJson ? JSON.parse(row.resultJson) : null,
      neighborhoodJson: row.neighborhoodJson ? JSON.parse(row.neighborhoodJson) : null,
    }
  }
  if (row.status !== 'processing' || !row.manusTaskId) {
    return { status: row.status }
  }

  const manusApiKey = config.manusApiKey
  if (!manusApiKey) return { status: 'processing' }

  const task = await getTaskResult(manusApiKey, row.manusTaskId)
  if (task.status === 'completed' && task.result?.output) {
    const resultJson = JSON.stringify({
      summary: task.result.output,
      raw: task.result,
    })
    await db
      .update(analyses)
      .set({ resultJson, status: 'completed' })
      .where(eq(analyses.id, Number(id)))
    return {
      status: 'completed',
      resultJson: JSON.parse(resultJson),
      neighborhoodJson: row.neighborhoodJson ? JSON.parse(row.neighborhoodJson) : null,
    }
  }

  return { status: 'processing' }
})
