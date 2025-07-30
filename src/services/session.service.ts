import { eq, and, gt, lt } from "drizzle-orm";
import crypto from "crypto"
import { db, gameSessions, accessTokens, profiles } from "@/database";
import {
  ERRORS,
  stripUUID,
  formatUUID,
  type ProfileResponse
} from "@/types/yggdrasil.types";
import { calculateExpirationTime } from "@/utils/crypto";
import { sessionLogger, logError } from "@/utils/logger";

export class SessionService {
  /**
   * Player joins server - stores session data
   * This is called by Minecraft client when joining a server
   */
  static async join(
    accessToken: string,
    selectedProfile: string,
    serverId: string,
    ip?: string
  ): Promise<void> {
    
    sessionLogger.info({
      action: 'join_request',
      selectedProfile,
      serverId,
      ip
    }, 'Player join request received')
    
    try {
      // Validate access token and get user info
      const token = await db.query.accessTokens.findFirst({
        where: and(
          eq(accessTokens.accessToken, accessToken),
          eq(accessTokens.isActive, true),
          gt(accessTokens.expiresAt, new Date())
        ),
        with: {
          user: true,
          profile: true
        }
      })

      if (!token || !token.user || !token.profile) {
        sessionLogger.warn({
          action: 'join_failed',
          reason: 'invalid_token',
          accessToken: accessToken.substring(0, 8) + '...'
        }, 'Invalid token or missing user/profile')
        throw ERRORS.INVALID_TOKEN
      }

      // Check if selected profile matches token profile
      const profileUuid = stripUUID(selectedProfile)
      const tokenProfileUuid = stripUUID(token.profile.id)
      
      sessionLogger.debug({
        profileUuid,
        tokenProfileUuid,
        match: profileUuid === tokenProfileUuid
      }, 'Profile UUID comparison')
      
      if (profileUuid !== tokenProfileUuid) {
        sessionLogger.warn({
          action: 'join_failed',
          reason: 'profile_mismatch',
          requestedProfile: profileUuid,
          tokenProfile: tokenProfileUuid
        }, 'Profile mismatch')
        throw ERRORS.INVALID_PROFILE
      }

      // Remove any existing sessions for this profile and server
      await db.delete(gameSessions)
        .where(and(
          eq(gameSessions.profileId, token.profile.id),
          eq(gameSessions.serverId, serverId)
        ))

      // Generate shared secret for this specific session
      const sharedSecret = crypto.randomBytes(16).toString('hex')
      
      sessionLogger.debug({
        sharedSecret,
        serverId
      }, 'Generated shared secret for session')
      
      // Store session data
      await db.insert(gameSessions).values({
        profileId: token.profile.id,
        serverId,
        sharedSecret,
        ipAddress: ip,
        expiresAt: calculateExpirationTime(5 / 60) // 5 minutes
      })

      sessionLogger.info({
        action: 'join_success',
        profileId: token.profile.id,
        profileName: token.profile.name,
        serverId,
        userId: token.user.id
      }, 'Session stored successfully')

      // Update token last used time
      await db.update(accessTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(accessTokens.id, token.id))

    } catch (error: any) {
      logError(error, 'SessionService.join')
      throw error
    }
  }

  /**
   * Server checks if player has joined
   * This is called by Minecraft server to verify player authentication
   */
  static async hasJoined(
    username: string,
    serverId: string,
    ip?: string
  ): Promise<ProfileResponse | null> {
    
    sessionLogger.info({
      action: 'hasjoined_request',
      username,
      serverId,
      ip
    }, 'Server checking if player has joined')
    
    try {
      // Find valid session by serverId
      const session = await db.query.gameSessions.findFirst({
        where: and(
          eq(gameSessions.serverId, serverId),
          gt(gameSessions.expiresAt, new Date())
        ),
        with: {
          profile: {
            with: {
              user: true
            }
          }
        }
      })

      if (!session || !session.profile) {
        sessionLogger.info({
          action: 'hasjoined_failed',
          reason: 'no_session',
          serverId,
          username
        }, 'No valid session found')
        return null
      }

      sessionLogger.debug({
        sessionId: session.id,
        profileName: session.profile.name,
        sharedSecret: session.sharedSecret,
        expiresAt: session.expiresAt
      }, 'Found valid session')

      // Check if username matches profile name (case-insensitive for safety)
      if (session.profile.name.toLowerCase() !== username.toLowerCase()) {
        sessionLogger.warn({
          action: 'hasjoined_failed',
          reason: 'username_mismatch',
          requestedUsername: username,
          profileUsername: session.profile.name
        }, 'Username mismatch')
        return null
      }

      // Optional IP validation (if both sides provide IP)
      if (ip && session.ipAddress && session.ipAddress !== ip) {
        sessionLogger.warn({
          action: 'hasjoined_failed',
          reason: 'ip_mismatch',
          requestedIP: ip,
          sessionIP: session.ipAddress
        }, 'IP address mismatch')
        return null
      }

      sessionLogger.info({
        action: 'hasjoined_success',
        username,
        serverId,
        profileId: session.profile.id,
        sharedSecret: session.sharedSecret
      }, 'Session validated successfully')

      // Delete the used session (one-time use for security)
      await db.delete(gameSessions)
        .where(eq(gameSessions.id, session.id))

      sessionLogger.debug({
        sessionId: session.id
      }, 'Session deleted after use')

      return this.buildProfileResponse(session.profile)

    } catch (error: any) {
      logError(error, 'SessionService.hasJoined')
      throw error
    }
  }

  /**
   * Get profile by UUID with textures
   */
  static async getProfile(uuid: string, unsigned?: boolean): Promise<ProfileResponse | null> {
    
    sessionLogger.info({
      action: 'profile_request',
      uuid,
      unsigned
    }, 'Profile request received')
    
    try {
      // Format UUID properly (add dashes if needed)
      const formattedUuid = formatUUID(uuid)
      
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, formattedUuid),
        with: {
          user: true
        }
      })

      if (!profile || !profile.isPublic || !profile.user?.isActive) {
        sessionLogger.info({
          action: 'profile_failed',
          reason: 'not_found_or_private',
          uuid: formattedUuid
        }, 'Profile not found or not accessible')
        return null
      }

      sessionLogger.info({
        action: 'profile_success',
        profileName: profile.name,
        profileId: profile.id
      }, 'Profile found and returned')

      return this.buildProfileResponse(profile, unsigned)

    } catch (error: any) {
      logError(error, 'SessionService.getProfile')
      throw error
    }
  }

  /**
   * Build profile response with textures property
   */
  private static buildProfileResponse(profile: any, unsigned?: boolean): ProfileResponse {
    const properties = []

    sessionLogger.debug({
      profileName: profile.name,
      skinUrl: profile.skinUrl,
      capeUrl: profile.capeUrl,
      skinModel: profile.skinModel
    }, 'Building profile response')

    // Add textures property if skin or cape exists
    if (profile.skinUrl || profile.capeUrl) {
      const textures: any = {
        timestamp: Date.now(),
        profileId: stripUUID(profile.id),
        profileName: profile.name,
        textures: {}
      }

      // Add skin texture
      if (profile.skinUrl) {
        textures.textures.SKIN = {
          url: profile.skinUrl
        }

        // Add model metadata for Alex/slim skin
        if (profile.skinModel === 'alex') {
          textures.textures.SKIN.metadata = {
            model: 'slim'
          }
        }
      }

      // Add cape texture  
      if (profile.capeUrl) {
        textures.textures.CAPE = {
          url: profile.capeUrl
        }
      }

      // Base64 encode textures data
      const texturesValue = Buffer.from(JSON.stringify(textures)).toString('base64')
      
      const textureProperty: any = {
        name: 'textures',
        value: texturesValue
      }

      properties.push(textureProperty)
      
      sessionLogger.debug({
        texturesSize: texturesValue.length,
        hasSkin: !!profile.skinUrl,
        hasCape: !!profile.capeUrl
      }, 'Added textures property to profile')
    } else {
      sessionLogger.debug('No textures found, returning empty properties')
    }

    return {
      id: stripUUID(profile.id),
      name: profile.name,
      properties
    }
  }

  /**
   * Cleanup expired sessions (should be run periodically)
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      await db.delete(gameSessions)
        .where(
          lt(gameSessions.expiresAt, new Date())
        )
      
      sessionLogger.info({
        action: 'cleanup_expired'
      }, 'Cleaned up expired sessions')
      
    } catch (error: any) {
      logError(error, 'SessionService.cleanupExpiredSessions')
    }
  }

  /**
   * Get active sessions count (for monitoring)
   */
  static async getActiveSessionsCount(): Promise<number> {
    try {
      const result = await db.query.gameSessions.findMany({
        where: gt(gameSessions.expiresAt, new Date())
      })
      
      const count = result.length
      sessionLogger.debug({
        action: 'active_sessions_count',
        count
      }, 'Retrieved active sessions count')
      
      return count
    } catch (error: any) {
      logError(error, 'SessionService.getActiveSessionsCount')
      return 0
    }
  }

  /**
   * Revoke all sessions for a profile (when user changes password, etc.)
   */
  static async revokeProfileSessions(profileId: string): Promise<void> {
    try {
      await db.delete(gameSessions)
        .where(eq(gameSessions.profileId, profileId))
      
      sessionLogger.info({
        action: 'revoke_profile_sessions',
        profileId
      }, 'Revoked all sessions for profile')
      
    } catch (error: any) {
      logError(error, 'SessionService.revokeProfileSessions')
      throw error
    }
  }

  /**
   * Get session info by serverId (for debugging)
   */
  static async getSessionInfo(serverId: string): Promise<any> {
    try {
      const session = await db.query.gameSessions.findFirst({
        where: eq(gameSessions.serverId, serverId),
        with: {
          profile: true
        }
      })
      
      sessionLogger.debug({
        action: 'get_session_info',
        serverId,
        found: !!session
      }, 'Retrieved session info for debugging')
      
      return session
    } catch (error: any) {
      logError(error, 'SessionService.getSessionInfo')
      return null
    }
  }
}