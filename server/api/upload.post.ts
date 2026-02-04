const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

export default defineEventHandler(async (event) => {
  try {
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
      throw createError({ statusCode: 400, message: 'File too large (max 80 MB)' })
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
    
    const inserted = await db.insert(analyses).values(insertValues).returning()
    const row = inserted[0]
    if (!row) {
      throw createError({ statusCode: 500, message: 'Database insert returned no row' })
    }
    
    console.log('[UPLOAD] Successfully inserted row:', row.id)
    return { id: row.id, fileName }
  } catch (err) {
    console.error('[UPLOAD] Error:', err)
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }
    throw createError({ 
      statusCode: 500, 
      message: err instanceof Error ? err.message : 'Upload failed' 
    })
  }
})
