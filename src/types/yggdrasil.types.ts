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

// Zod Validation Schemas
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
  email: z.string().email('Valid email is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(16, 'Username must be at most 16 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  profileName: z.string().min(3, 'Profile name must be at least 3 characters').max(16, 'Profile name must be at most 16 characters')
})

// Response Types
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
    email: string
    username: string
    profile: {
      id: string
      name: string
    }
  }
}

// Request Types (inferred from Zod schemas)
export type AuthenticateRequest = z.infer<typeof AuthenticateSchema>
export type RefreshRequest = z.infer<typeof RefreshSchema>
export type ValidateRequest = z.infer<typeof ValidateSchema>
export type InvalidateRequest = z.infer<typeof InvalidateSchema>
export type SignoutRequest = z.infer<typeof SignoutSchema>
export type RegisterRequest = z.infer<typeof RegisterSchema>

// Utility functions
export const stripUUID = (uuid: string): string => uuid.replace(/-/g, '')

export const formatUUID = (uuid: string): string => {
  if (uuid.length === 32) {
    return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`
  }
  return uuid
}

// Error constants
export const ERRORS = {
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
  ACCOUNT_NOT_PREMIUM: {
    error: 'ForbiddenOperationException',
    errorMessage: 'Account is not premium.'
  },
  INVALID_AGENT: {
    error: 'IllegalArgumentException',
    errorMessage: 'Access denied.'
  },
  EMAIL_TAKEN: {
    error: 'IllegalArgumentException',
    errorMessage: 'Email address is already taken.'
  },
  USERNAME_TAKEN: {
    error: 'IllegalArgumentException',
    errorMessage: 'Username is already taken.'
  },
  PROFILE_NAME_TAKEN: {
    error: 'IllegalArgumentException',
    errorMessage: 'Profile name is already taken.'
  }
} as const