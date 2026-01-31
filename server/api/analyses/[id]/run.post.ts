import { getDb } from '../../../db'
import { analyses } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { uploadFileToManus, createAnalysisTask, getTaskResult } from '../../../utils/manus'
import { geocodeAddress, extractPostcode } from '../../../utils/geocode'
import { fetchLocalNews } from '../../../utils/news'

const config = useRuntimeConfig()

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

  if (!row.fileData) throw createError({ statusCode: 404, message: 'File data not found' })

  const manusApiKey = config.manusApiKey
  if (!manusApiKey) throw createError({ statusCode: 503, message: 'Manus API not configured' })

  console.log('[RUN] Setting status to processing for analysis:', id)
  await db.update(analyses).set({ status: 'processing' }).where(eq(analyses.id, Number(id)))
  console.log('[RUN] Status updated to processing')

  let taskId = ''
  try {
    // Step 1: Fetch news data BEFORE creating Manus task to enrich the prompt
    const address = body.address ?? row.address
    let newsContext: string | undefined
    let neighborhoodJson: string | undefined
    
    console.log('[RUN] News API check - address:', !!address, '| newsApiKey:', !!config.newsApiKey, '| address value:', address)
    
    if (address && config.newsApiKey) {
      try {
        console.log('[RUN] Fetching news data for address:', address)
        const geo = await geocodeAddress(address)
        const postcode = extractPostcode(address, geo)
        
        // Fallback to full address if no postcode found
        const searchQuery = postcode || address
        console.log('[RUN] Using search query for NewsAPI:', searchQuery, '(postcode:', !!postcode, ')')
        
        const news = await fetchLocalNews(config.newsApiKey, searchQuery, 8)
        console.log('[RUN] News API returned', news.length, 'articles')
        
        // Build news context for Manus prompt
        if (news.length > 0) {
          newsContext = `Aktuelle Nachrichten zur Lage (PLZ ${postcode || 'Region'}):\n\n`
          news.forEach((n, idx) => {
            newsContext += `${idx + 1}. [${n.sentiment?.toUpperCase() || 'NEUTRAL'}] ${n.title}\n   Datum: ${new Date(n.publishedAt).toLocaleDateString('de-DE')}\n\n`
          })
          console.log('[RUN] News context prepared with', news.length, 'articles')
        } else {
          console.log('[RUN] No news articles found, newsContext will be undefined')
        }
        
        // Store neighborhood data for later display
        neighborhoodJson = JSON.stringify({
          address: geo?.displayName ?? address,
          news: news.map((n) => ({
            title: n.title,
            url: n.url,
            publishedAt: n.publishedAt,
            sentiment: n.sentiment,
          })),
        })
        
        // Update address if provided
        if (address && address !== row.address) {
          await db
            .update(analyses)
            .set({ address, neighborhoodJson })
            .where(eq(analyses.id, Number(id)))
        } else {
          await db
            .update(analyses)
            .set({ neighborhoodJson })
            .where(eq(analyses.id, Number(id)))
        }
        console.log('[RUN] Neighborhood data stored')
      } catch (err) {
        console.error('[RUN] News fetch failed (continuing without news context):', err)
      }
    }

    // Step 2: Upload file to Manus (read from database base64)
    const fileBuffer = Buffer.from(row.fileData, 'base64')
    console.log('[RUN] Uploading file to Manus, size:', fileBuffer.length, 'bytes')
    const fileRes = await uploadFileToManus(manusApiKey, fileBuffer, row.fileName)
    const fileId = (fileRes as { id: string }).id
    
    if (!fileId) {
      throw new Error('Manus file upload failed: no file ID returned')
    }
    
    // Step 3: Create analysis task WITH news context enrichment
    console.log('[RUN] Creating analysis task with fileId:', fileId, '| Has news context:', !!newsContext)
    const taskRes = await createAnalysisTask(manusApiKey, fileId, undefined, newsContext)
    taskId = (taskRes as { id: string }).id
    
    if (!taskId) {
      throw new Error('Manus task creation failed: no task ID returned')
    }

    console.log('[RUN] Updating manusTaskId:', taskId)
    await db
      .update(analyses)
      .set({ manusTaskId: taskId })
      .where(eq(analyses.id, Number(id)))
    console.log('[RUN] manusTaskId updated')

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
