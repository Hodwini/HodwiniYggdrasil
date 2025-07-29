import { drizzle } from 'drizzle-orm/node-postgres'
import { relations } from 'drizzle-orm'
import { Pool } from 'pg'

import { users } from './schemas/users'
import { profiles } from './schemas/profiles'
import { accessTokens } from './schemas/tokens'
import { gameSessions } from './schemas/sessions'
import { skins, capes } from './schemas/skins'

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  profiles: many(profiles),
  accessTokens: many(accessTokens),
  uploadedSkins: many(skins),
  uploadedCapes: many(capes)
}))

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id]
  }),
  accessTokens: many(accessTokens),
  gameSessions: many(gameSessions)
}))

export const accessTokensRelations = relations(accessTokens, ({ one }) => ({
  user: one(users, {
    fields: [accessTokens.userId],
    references: [users.id]
  }),
  profile: one(profiles, {
    fields: [accessTokens.profileId],
    references: [profiles.id]
  })
}))

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  profile: one(profiles, {
    fields: [gameSessions.profileId],
    references: [profiles.id]
  })
}))

export const skinsRelations = relations(skins, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [skins.uploadedBy],
    references: [users.id]
  })
}))

export const capesRelations = relations(capes, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [capes.uploadedBy],
    references: [users.id]
  })
}))

// Database schema with relations
const schema = {
  users,
  profiles,
  accessTokens,
  gameSessions,
  skins,
  capes,
  usersRelations,
  profilesRelations,
  accessTokensRelations,
  gameSessionsRelations,
  skinsRelations,
  capesRelations
}

// Connection configuration
const connectionConfig = {
  host: Bun.env.DB_HOST || 'localhost',
  port: Number(Bun.env.DB_PORT) || 5432,
  user: Bun.env.DB_USERNAME || 'postgres',
  password: Bun.env.DB_PASSWORD || '',
  database: Bun.env.DB_NAME || 'typedrasil',
  ssl: Bun.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}

// Create connection pool
const pool = new Pool(connectionConfig)

// Create drizzle instance with relations
export const db = drizzle(pool, { 
  schema,
  logger: Bun.env.NODE_ENV === 'development'
})

// Export schemas for direct use
export {
  users,
  profiles,
  accessTokens,
  gameSessions,
  skins,
  capes
}

// Export types
export type {
  User,
  NewUser
} from './schemas/users'

export type {
  Profile,
  NewProfile
} from './schemas/profiles'

export type {
  AccessToken,
  NewAccessToken
} from './schemas/tokens'

export type {
  GameSession,
  NewGameSession
} from './schemas/sessions'

export type {
  Skin,
  NewSkin,
  Cape,
  NewCape
} from './schemas/skins'