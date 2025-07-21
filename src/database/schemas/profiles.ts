import { pgTable, uuid, varchar, text, timestamp, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 16 }).notNull(),
  skinUrl: text('skin_url'),
  capeUrl: text('cape_url'),
  skinHash: varchar('skin_hash', { length: 64 }),
  capeHash: varchar('cape_hash', { length: 64 }),
  skinModel: varchar('skin_model', { length: 10 }).default('steve'),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  nameIdx: uniqueIndex('profiles_name_idx').on(table.name),
  userIdIdx: index('profiles_user_id_idx').on(table.userId)
}))

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert