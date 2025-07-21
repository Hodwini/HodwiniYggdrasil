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

export const AuthenticateSchema = z.object({
  agent: z.object({
    name: z.literal('Minecraft'),
    version: z.literal(1)
  }),
  username: z.string().min(1),
  password: z.string().min(1),
  clientToken: z.string().optional(),
  requestUser: z.boolean().optional()
})

export const RefreshSchema = z.object({
  accessToken: z.string().min(1),
  clientToken: z.string().min(1),
  requestUser: z.boolean().optional()
})

export const ValidateSchema = z.object({
  accessToken: z.string().min(1),
  clientToken: z.string().optional()
})

export const InvalidateSchema = z.object({
  accessToken: z.string().min(1),
  clientToken: z.string().min(1)
})

export const SignoutSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

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
  selectedProfile?: GameProfile
  user?: User
}

export const stripUUID = (uuid: string): string => uuid.replace(/-/g, '')
export const formatUUID = (uuid: string): string => {
  if (uuid.length === 32) {
    return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`
  }
  return uuid
}

export const ERRORS = {
  INVALID_CREDENTIALS: {
    error: 'ForbiddenOperationException',
    errorMessage: 'Invalid credentials. Invalid username or password.'
  },
  INVALID_TOKEN: {
    error: 'ForbiddenOperationException', 
    errorMessage: 'Invalid token.'
  }
}