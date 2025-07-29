import crypto from 'crypto'

/**
 * Generate random hex string for access tokens
 */
export const generateAccessToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate random UUID for client tokens
 */
export const generateClientToken = (): string => {
  return crypto.randomUUID()
}

/**
 * Generate random server ID for game sessions
 */
export const generateServerId = (): string => {
  return crypto.randomBytes(10).toString('hex')
}

/**
 * Generate shared secret for server authentication
 */
export const generateSharedSecret = (): string => {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Calculate expiration time for tokens
 * @param hours - Hours from now
 */
export const calculateExpirationTime = (hours: number = 24): Date => {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}