import formidable from 'formidable'
import { readFile } from 'fs/promises'

const MAX_SIZE = 80 * 1024 * 1024 // 80 MB

export default defineEventHandler(async (event) => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_SIZE,
      keepExtensions: true,
    })

    form.parse(event.node.req, async (err, fields, files) => {
      try {
        if (err) {
          return reject(
            createError({
              statusCode: 400,
              statusMessage: 'Bad Request',
              message: err.message || 'Upload failed',
            })
          )
        }

        const fileArray = files.file
        if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
          return reject(createError({ statusCode: 400, message: 'No file uploaded' }))
        }

        const file = Array.isArray(fileArray) ? fileArray[0] : fileArray
        if (!file) {
          return reject(createError({ statusCode: 400, message: 'Missing file' }))
        }

        if (file.mimetype !== 'application/pdf') {
          return reject(createError({ statusCode: 400, message: 'Only PDF files are allowed' }))
        }

        // Read file data and convert to base64
        const fileBuffer = await readFile(file.filepath)
        const fileName = `expose-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`
        const fileData = fileBuffer.toString('base64')

        const { getDb, analyses } = await import('../db')
        const db = getDb()

        const insertValues = {
          fileName,
          fileData,
          status: 'uploaded' as const,
        }

        console.log('[UPLOAD] Storing PDF in database, size:', fileBuffer.length, 'bytes')

        const inserted = await db.insert(analyses).values(insertValues).returning()
        const row = inserted[0]
        if (!row) {
          return reject(createError({ statusCode: 500, message: 'Database insert returned no row' }))
        }

        console.log('[UPLOAD] Successfully inserted row:', row.id)
        resolve({ id: row.id, fileName })
      } catch (error) {
        console.error('[UPLOAD] Error:', error)
        if (error && typeof error === 'object' && 'statusCode' in error) {
          return reject(error)
        }
        reject(
          createError({
            statusCode: 500,
            message: error instanceof Error ? error.message : 'Upload failed',
          })
        )
      }
    })
  })
})
