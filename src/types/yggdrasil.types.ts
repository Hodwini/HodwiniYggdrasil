import { z } from 'zod'

export interface YggdrasilError {
  error: string
  errorMessage: string
  cause?: string
}

export interface GameProfile {
  id: string
  name: string
  properties?: Property[]
}

export interface Property {
  name: string
  value: string
  signature?: string
}

export interface User {
  id: string
  username: string
  properties?: Property[]
}

// Auth Server Schemas

export const AuthenticateSchema = z.object({
  agent: z.object({
    name: z.literal('Minecraft'),
    version: z.literal(1)
  }),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  clientToken: z.string().optional(),
  requestUser: z.boolean().optional()
})

export const RefreshSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  clientToken: z.string().min(1, 'Client token is required'),
  requestUser: z.boolean().optional()
})

export const ValidateSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  clientToken: z.string().optional()
})

export const InvalidateSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  clientToken: z.string().min(1, 'Client token is required')
})

export const SignoutSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(1).max(16, 'Username must be 1-16 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  profileName: z.string().min(1).max(16, 'Profile name must be 1-16 characters')
})

// Session Server Schemas

export const JoinSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
  selectedProfile: z.string().regex(
    /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid UUID format for selectedProfile"
  ),
  serverId: z.string().min(1, "Server ID is required")
})

export const HasJoinedSchema = z.object({
  username: z.string().min(1),
  serverId: z.string().min(1),
  ip: z.union([
    z.string().ip(),
    z.string().length(0),
    z.undefined()
  ]).optional()
})

export const ProfileParamsSchema = z.object({
  uuid: z.string().regex(
    /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid UUID format"
  )
})

export const ProfileQuerySchema = z.object({
  unsigned: z.string().transform(val => val === 'true').pipe(z.boolean()).optional()
})

// Auth Server Response Types

export interface AuthenticateResponse {
  accessToken: string
  clientToken: string
  availableProfiles: GameProfile[]
  selectedProfile?: GameProfile
  user?: User
}

export interface RefreshResponse {
  accessToken: string
  clientToken: string
  availableProfiles: GameProfile[]
  selectedProfile?: GameProfile
  user?: User
}

export interface RegisterResponse {
  message: string
  user: {
    id: string
    email: string
    username: string
  }
  profile: {
    id: string
    name: string
  }
}

// Session Server Types

export interface JoinRequest {
  accessToken: string
  selectedProfile: string
  serverId: string
}

export interface HasJoinedQuery {
  username: string
  serverId: string
  ip?: string
}

export interface ProfileResponse {
  id: string
  name: string
  properties: Array<{
    name: string
    value: string
    signature?: string
  }>
}

export interface PlayerTextures {
  timestamp: number
  profileId: string
  profileName: string
  textures: {
    SKIN?: {
      url: string
      metadata?: {
        model: 'slim' | 'classic'
      }
    }
    CAPE?: {
      url: string
    }
  }
}

//  Request Types (inferred from Zod schemas)

export type AuthenticateRequest = z.infer<typeof AuthenticateSchema>
export type RefreshRequest = z.infer<typeof RefreshSchema>
export type ValidateRequest = z.infer<typeof ValidateSchema>
export type InvalidateRequest = z.infer<typeof InvalidateSchema>
export type SignoutRequest = z.infer<typeof SignoutSchema>
export type RegisterRequest = z.infer<typeof RegisterSchema>

// Session Server request types
export type JoinRequestType = z.infer<typeof JoinSchema>
export type HasJoinedQueryType = z.infer<typeof HasJoinedSchema>
export type ProfileParamsType = z.infer<typeof ProfileParamsSchema>
export type ProfileQueryType = z.infer<typeof ProfileQuerySchema>

// Utility Function

export const stripUUID = (uuid: string): string => uuid.replace(/-/g, '')

export const formatUUID = (uuid: string): string => {
  if (uuid.length === 32) {
    return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`
  }
  return uuid
}

export const createTexturesProperty = (
  profileId: string,
  profileName: string,
  skinUrl?: string,
  capeUrl?: string,
  skinModel?: string
): Property => {
  const textures: PlayerTextures = {
    timestamp: Date.now(),
    profileId: stripUUID(profileId),
    profileName,
    textures: {}
  }

  if (skinUrl) {
    textures.textures.SKIN = {
      url: skinUrl,
      metadata: skinModel === 'alex' ? { model: 'slim' } : undefined
    }
  }

  if (capeUrl) {
    textures.textures.CAPE = {
      url: capeUrl
    }
  }

  return {
    name: 'textures',
    value: Buffer.from(JSON.stringify(textures)).toString('base64')
  }
}

export const parseTexturesProperty = (property: Property): PlayerTextures | null => {
  try {
    if (property.name !== 'textures') return null
    const decoded = Buffer.from(property.value, 'base64').toString('utf-8')
    return JSON.parse(decoded) as PlayerTextures
  } catch {
    return null
  }
}

export const ERRORS = {
  // Auth Server Errors
  INVALID_CREDENTIALS: {
    error: 'ForbiddenOperationException',
    errorMessage: 'Invalid credentials. Invalid username or password.'
  },
  INVALID_TOKEN: {
    error: 'ForbiddenOperationException', 
    errorMessage: 'Invalid token.'
  },
  ACCOUNT_MIGRATED: {
    error: 'ForbiddenOperationException',
    errorMessage: 'Account migrated, use e-mail as username.'
  },
  ACCOUNT_NOT_FOUND: {
    error: 'ForbiddenOperationException',
    errorMessage: 'Account not found.'
  },
  INVALID_AGENT: {
    error: 'ForbiddenOperationException',
    errorMessage: 'Invalid agent. Only Minecraft is supported.'
  },
  TOKEN_EXPIRED: {
    error: 'ForbiddenOperationException',
    errorMessage: 'Token has expired.'
  },
  USER_ALREADY_EXISTS: {
    error: 'ConflictException',
    errorMessage: 'User with this email already exists.'
  },
  USERNAME_TAKEN: {
    error: 'ConflictException',
    errorMessage: 'Username is already taken.'
  },
  PROFILE_NAME_TAKEN: {
    error: 'ConflictException',
    errorMessage: 'Profile name is already taken.'
  },

  // Session Server Errors
  SESSION_NOT_FOUND: {
    error: 'ForbiddenOperationException',
    errorMessage: 'Session not found or expired.'
  },
  INVALID_PROFILE: {
    error: 'ForbiddenOperationException', 
    errorMessage: 'Invalid profile for this token.'
  },
  PROFILE_NOT_FOUND: {
    error: 'NoSuchProfileException',
    errorMessage: 'Profile not found.'
  },
  INVALID_UUID: {
    error: 'IllegalArgumentException',
    errorMessage: 'Invalid UUID format.'
  },
  IP_MISMATCH: {
    error: 'ForbiddenOperationException',
    errorMessage: 'IP address does not match session.'
  },

  // General Errors
  VALIDATION_ERROR: {
    error: 'IllegalArgumentException',
    errorMessage: 'Invalid request format or missing required fields.'
  },
  INTERNAL_ERROR: {
    error: 'InternalServerError',
    errorMessage: 'An unexpected error occurred.'
  },
  RATE_LIMITED: {
    error: 'TooManyRequestsException',
    errorMessage: 'Too many requests. Please try again later.'
  }
} as const

// Validation helpers
export const validateUUID = (uuid: string): boolean => {
  return /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)
}

export const validateUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{1,16}$/.test(username)
}

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Status Codes

export const HTTP_STATUS = {
  OK: 200,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const