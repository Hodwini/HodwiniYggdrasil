import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core'
import { profiles } from './profiles'

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  serverId: varchar('server_id', { length: 255 }).notNull(),
  sharedSecret: varchar('shared_secret', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  profileServerIdx: index('game_sessions_profile_server_idx').on(table.profileId, table.serverId),
  expiresAtIdx: index('game_sessions_expires_at_idx').on(table.expiresAt)
}))

export type GameSession = typeof gameSessions.$inferSelect
export type NewGameSession = typeof gameSessions.$inferInsert