import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
// Using drizzle-orm/libsql for Turso - sqlite-core schema is compatible

export const analyses = sqliteTable('analyses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  address: text('address'),
  filePath: text('file_path').notNull(),
  manusTaskId: text('manus_task_id'),
  status: text('status').notNull().default('uploaded'), // uploaded | processing | completed | failed
  resultJson: text('result_json'), // Manus analysis result
  neighborhoodJson: text('neighborhood_json'), // crime + news
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export type Analysis = typeof analyses.$inferSelect
export type NewAnalysis = typeof analyses.$inferInsert
