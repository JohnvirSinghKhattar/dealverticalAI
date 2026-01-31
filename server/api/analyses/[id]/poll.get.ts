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

  console.log('[POLL] Checking Manus task status for:', row.manusTaskId)
  const task = await getTaskResult(manusApiKey, row.manusTaskId)
  console.log('[POLL] Manus task status:', task.status || task.task_status)
  
  // Check if task is completed
  if (task.status === 'completed' || task.task_status === 'completed') {
    console.log('[POLL] Task completed! Processing output...')
    
    // Extract the output text from Manus response structure
    let outputText = ''
    if (task.output && Array.isArray(task.output)) {
      // Find the last assistant message with text content
      for (let i = task.output.length - 1; i >= 0; i--) {
        const item = task.output[i]
        if (item.role === 'assistant' && item.content && Array.isArray(item.content)) {
          const textContent = item.content.find((c: any) => c.type === 'output_text')
          if (textContent?.text) {
            outputText = textContent.text
            break
          }
        }
      }
    } else if (task.result?.output) {
      // Fallback to old structure if exists
      outputText = task.result.output
    }
    
    if (outputText) {
      console.log('[POLL] Found output text, updating database...')
      
      // Try to parse structured JSON from Manus response
      let parsedResult: Record<string, unknown> | null = null
      try {
        // Try to extract JSON from the response (might be wrapped in markdown code blocks)
        let jsonStr = outputText.trim()
        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        parsedResult = JSON.parse(jsonStr)
        console.log('[POLL] Successfully parsed structured JSON result')
      } catch (parseErr) {
        console.log('[POLL] Could not parse as JSON, storing as raw text')
        // If not valid JSON, store as legacy format
        parsedResult = { summary: outputText, raw: task }
      }
      
      const resultJson = JSON.stringify(parsedResult)
      await db
        .update(analyses)
        .set({ resultJson, status: 'completed' })
        .where(eq(analyses.id, Number(id)))
      return {
        status: 'completed',
        resultJson: JSON.parse(resultJson),
        neighborhoodJson: row.neighborhoodJson ? JSON.parse(row.neighborhoodJson) : null,
      }
    } else {
      console.warn('[POLL] Task completed but no output text found')
    }
  }

  // Return processing status with progress information from Manus
  return { 
    status: 'processing',
    progress: task.progress,
    currentStep: task.current_step || task.task_status || task.status,
    manusTaskUrl: `https://manus.im/app/${row.manusTaskId}`,
  }
})
