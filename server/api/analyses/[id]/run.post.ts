import { getDb } from '../../../db'
import { analyses } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { uploadFileToManus, createAnalysisTask, getTaskResult } from '../../../utils/manus'
import { geocodeAddress, extractPostcode } from '../../../utils/geocode'
import { fetchLocalNews } from '../../../utils/news'
import { fetchNearbyAmenities } from '../../../utils/amenities'

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
    
    // Step 1a: Geocode address first (needed for both news and amenities)
    let geo: Awaited<ReturnType<typeof geocodeAddress>> = null
    let amenitiesJson: string | undefined
    
    if (address) {
      try {
        console.log('[RUN] Geocoding address:', address)
        geo = await geocodeAddress(address)
        
        if (geo) {
          console.log('[RUN] Geocoded to:', geo.lat, geo.lon)
          
          // Fetch nearby amenities from OpenStreetMap Overpass API
          try {
            console.log('[RUN] Fetching nearby amenities...')
            const amenities = await fetchNearbyAmenities(geo.lat, geo.lon, 2000)
            amenitiesJson = JSON.stringify(amenities)
            console.log('[RUN] Amenities fetched successfully')
          } catch (amenitiesErr) {
            console.error('[RUN] Amenities fetch failed (continuing without amenities):', amenitiesErr)
          }
        }
      } catch (geoErr) {
        console.error('[RUN] Geocoding failed:', geoErr)
      }
    }
    
    // Step 1b: Fetch news data
    if (address && config.newsApiKey) {
      try {
        console.log('[RUN] Fetching news data for address:', address)
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
        
        // Update address, neighborhood, and amenities data
        const updateData: Record<string, unknown> = { neighborhoodJson }
        if (amenitiesJson) updateData.amenitiesJson = amenitiesJson
        if (address && address !== row.address) updateData.address = address
        
        await db
          .update(analyses)
          .set(updateData)
          .where(eq(analyses.id, Number(id)))
        
        console.log('[RUN] Neighborhood and amenities data stored')
      } catch (err) {
        console.error('[RUN] News fetch failed (continuing without news context):', err)
      }
    } else if (amenitiesJson) {
      // Store amenities even if no news API key
      const updateData: Record<string, unknown> = { amenitiesJson }
      if (address && address !== row.address) updateData.address = address
      
      await db
        .update(analyses)
        .set(updateData)
        .where(eq(analyses.id, Number(id)))
      
      console.log('[RUN] Amenities data stored (no news API key)')
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
