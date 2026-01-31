import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const UPLOAD_DIR = join(process.cwd(), 'data', 'uploads')

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }
  const file = form.find((f) => f.name === 'file' && f.data)
  if (!file?.data) {
    throw createError({ statusCode: 400, message: 'Missing file' })
  }
  if (file.type !== 'application/pdf') {
    throw createError({ statusCode: 400, message: 'Only PDF files are allowed' })
  }
  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, message: 'File too large (max 10 MB)' })
  }

  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
  const filename = `expose-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`
  const filePath = join(UPLOAD_DIR, filename)
  writeFileSync(filePath, file.data)

  const { getDb, analyses } = await import('../db')
  const db = getDb()
  
  // Explicitly construct the insert values
  const insertValues = {
    filePath: filename,
    status: 'uploaded' as const,
  }
  
  console.log('[UPLOAD] Attempting to insert with values:', insertValues)
  
  let row
  try {
    const inserted = await db.insert(analyses).values(insertValues).returning()
    row = inserted[0]
    if (!row) throw createError({ statusCode: 500, message: 'Insert failed' })
    
    console.log('[UPLOAD] Successfully inserted row:', row)
  } catch (err) {
    console.error('[UPLOAD] Insert failed with error:', err)
    throw err
  }

  return { id: row.id, filePath: filename }
})
