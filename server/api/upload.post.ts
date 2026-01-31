const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

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

  // Store file as base64 in database (no filesystem writes for Vercel compatibility)
  const fileName = `expose-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`
  const fileData = file.data.toString('base64')

  const { getDb, analyses } = await import('../db')
  const db = getDb()
  
  const insertValues = {
    fileName,
    fileData,
    status: 'uploaded' as const,
  }
  
  console.log('[UPLOAD] Storing PDF in database, size:', file.data.length, 'bytes')
  
  let row
  try {
    const inserted = await db.insert(analyses).values(insertValues).returning()
    row = inserted[0]
    if (!row) throw createError({ statusCode: 500, message: 'Insert failed' })
    
    console.log('[UPLOAD] Successfully inserted row:', row.id)
  } catch (err) {
    console.error('[UPLOAD] Insert failed with error:', err)
    throw err
  }

  return { id: row.id, fileName }
})
