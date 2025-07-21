import { drizzle } from 'drizzle-orm/pg-core'

import { users } from './schemas/users'
import { profiles } from './schemas/profiles'
import { accessTokens } from './schemas/tokens'
import { gameSessions } from './schemas/sessions'
import { skins, capes } from './schemas/skins'

const schema = {
    users,
    profiles,
    accessTokens,
    gameSessions,
    skins,
    capes
}

const connectionString = Bun.env.DATABASE_URL || "postgresql://user:password@localhost:5432/typedrasil"

export const db = drizzle(schema);

export {
  users,
  profiles,
  accessTokens,
  gameSessions,
  skins,
  capes
}

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