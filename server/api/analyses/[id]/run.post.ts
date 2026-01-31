import { getDb } from '../../../db'
import { analyses } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { uploadFileToManus, createAnalysisTask, getTaskResult } from '../../../utils/manus'
import { geocodeAddress, getCityFromGeocode } from '../../../utils/geocode'
import { fetchLocalNews } from '../../../utils/news'

const config = useRuntimeConfig()
const UPLOAD_DIR = join(process.cwd(), 'data', 'uploads')

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readBody(event).catch(() => ({})) as { address?: string }
  const db = getDb()

  const [row] = await db.select().from(analyses).where(eq(analyses.id, Number(id)))
  if (!row) throw createError({ statusCode: 404, message: 'Analysis not found' })
  if (row.status === 'processing') {
    return { status: 'processing', manusTaskId: row.manusTaskId }
  }

  const fullPath = join(UPLOAD_DIR, row.filePath)
  if (!existsSync(fullPath)) throw createError({ statusCode: 404, message: 'File not found' })

  const manusApiKey = config.manusApiKey
  if (!manusApiKey) throw createError({ statusCode: 503, message: 'Manus API not configured' })

  await db.update(analyses).set({ status: 'processing' }).where(eq(analyses.id, Number(id)))

  let taskId = ''
  try {
    const fileBuffer = readFileSync(fullPath)
    const fileRes = await uploadFileToManus(manusApiKey, fileBuffer, row.filePath)
    const fileId = (fileRes as { id: string }).id
    const taskRes = await createAnalysisTask(manusApiKey, fileId)
    taskId = (taskRes as { id: string }).id

    await db
      .update(analyses)
      .set({ manusTaskId: taskId })
      .where(eq(analyses.id, Number(id)))

    // Neighborhood: use provided address or leave for later
    let neighborhoodJson: string | null = null
    const address = body.address ?? row.address
    if (address && config.newsApiKey) {
          const geo = await geocodeAddress(address)
          const city = geo ? getCityFromGeocode(geo) : address
          const news = await fetchLocalNews(config.newsApiKey, city, 8)
          neighborhoodJson = JSON.stringify({
            address: geo?.displayName ?? address,
            news: news.map((n) => ({
              title: n.title,
              url: n.url,
              publishedAt: n.publishedAt,
              sentiment: n.sentiment,
            })),
          })
          await db
            .update(analyses)
            .set({
              address: address,
              neighborhoodJson,
            })
            .where(eq(analyses.id, Number(id)))
        }

    // Poll once for immediate result (optional; usually task takes longer)
    const task = await getTaskResult(manusApiKey, taskId)
    let status: string = 'processing'
    if (task.status === 'completed' && task.result?.output) {
      const resultJson = JSON.stringify({
        summary: task.result.output,
        raw: task.result,
      })
      await db
        .update(analyses)
        .set({ resultJson, status: 'completed' })
        .where(eq(analyses.id, Number(id)))
      status = 'completed'
    }

    return { status, manusTaskId: taskId }
  } catch (e) {
    await db
      .update(analyses)
      .set({ status: 'failed' })
      .where(eq(analyses.id, Number(id)))
    throw createError({
      statusCode: 502,
      message: e instanceof Error ? e.message : 'Analysis failed',
    })
  }
})
