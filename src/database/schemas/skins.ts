import { pgTable, uuid, varchar, text, integer, timestamp, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const skins = pgTable('skins', {
  id: uuid('id').primaryKey().defaultRandom(),
  hash: varchar('hash', { length: 64 }).notNull(),
  data: text('data').notNull(), // base64 PNG
  model: varchar('model', { length: 10 }).default('steve'),
  width: integer('width').default(64),
  height: integer('height').default(64),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  hashIdx: uniqueIndex('skins_hash_idx').on(table.hash),
  uploadedByIdx: index('skins_uploaded_by_idx').on(table.uploadedBy)
}))

export const capes = pgTable('capes', {
  id: uuid('id').primaryKey().defaultRandom(),
  hash: varchar('hash', { length: 64 }).notNull(),
  data: text('data').notNull(), // base64 PNG
  width: integer('width').default(64),
  height: integer('height').default(32),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  hashIdx: uniqueIndex('capes_hash_idx').on(table.hash),
  uploadedByIdx: index('capes_uploaded_by_idx').on(table.uploadedBy)
}))

export type Skin = typeof skins.$inferSelect
export type NewSkin = typeof skins.$inferInsert
export type Cape = typeof capes.$inferSelect
export type NewCape = typeof capes.$inferInsert