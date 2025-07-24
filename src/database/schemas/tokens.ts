import { pgTable, uuid, varchar, text, timestamp, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { profiles } from './profiles';

export const accessTokens = pgTable('access_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  accessToken: varchar('access_token', { length: 255 }).notNull(),
  clientToken: varchar('client_token', { length: 255 }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at').defaultNow()
}, (table) => ({
  accessTokenIdx: uniqueIndex('access_tokens_token_idx').on(table.accessToken),
  userIdIdx: index('access_tokens_user_id_idx').on(table.userId),
  profileIdIdx: index('access_tokens_profile_id_idx').on(table.profileId),
  expiresAtIdx: index('access_tokens_expires_at_idx').on(table.expiresAt),
  activeIdx: index('access_tokens_active_idx').on(table.isActive)
}));

export type AccessToken = typeof accessTokens.$inferSelect;
export type NewAccessToken = typeof accessTokens.$inferInsert;