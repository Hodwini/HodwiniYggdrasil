import { eq, and } from "drizzle-orm";
import { join } from "path";
import { db, profiles, capes, accessTokens } from "@/database";
import { ERRORS, formatUUID, validateUUID } from "@/types/yggdrasil.types";
import { validateTexture, getTextureStoragePath, getTextureURL } from "@/utils/image";
import { authLogger } from "@/utils/logger";

export interface CapeUploadResult {
  hash: string
  url: string
  message: string
}

export interface CapeInfo {
  hash: string
  url: string
  width: number
  height: number
  uploadedAt: Date
}

export class CapeService {
  private static readonly TEXTURES_DIR = 'public/textures'
  private static readonly BASE_URL = Bun.env.BASE_URL || 'http://localhost:3000'

  /**
   * Upload cape for a profile
   */
  static async uploadCape(
    profileId: string,
    imageBuffer: Buffer,
    userId?: string,
    accessToken?: string
  ): Promise<CapeUploadResult> {
    
    authLogger.info({
      action: 'cape_upload_request',
      profileId: profileId.substring(0, 8) + '...',
      fileSize: imageBuffer.length
    }, 'Cape upload request received')

    try {
      // Validate UUID format
      if (!validateUUID(profileId)) {
        throw ERRORS.INVALID_UUID
      }

      const formattedUuid = formatUUID(profileId)

      // Validate and process image
      const validation = validateTexture(imageBuffer, 'cape')
      if (!validation.isValid) {
        authLogger.warn({
          action: 'cape_upload_failed',
          reason: 'invalid_image',
          error: validation.error
        }, 'Cape validation failed')
        throw {
          error: 'IllegalArgumentException',
          errorMessage: validation.error || 'Invalid cape image'
        }
      }

      const { hash } = validation

      // Check if user has permission to upload to this profile
      if (accessToken) {
        const hasPermission = await this.validateProfileAccess(accessToken, formattedUuid)
        if (!hasPermission) {
          throw ERRORS.INVALID_PROFILE
        }
      }

      // Get profile
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, formattedUuid),
        with: { user: true }
      })

      if (!profile) {
        throw ERRORS.PROFILE_NOT_FOUND
      }

      // Check if cape already exists (deduplication)
      let existingCape = await db.query.capes.findFirst({
        where: eq(capes.hash, hash!)
      })

      if (!existingCape) {
        // Store new cape file
        const storagePath = getTextureStoragePath(hash!, 'cape')
        const fullPath = join(this.TEXTURES_DIR, storagePath)
        
        // Ensure directory exists
        await this.ensureDirectoryExists(fullPath)
        
        // Write file
        await Bun.write(fullPath, imageBuffer)

        // Save cape metadata to database
        const [newCape] = await db.insert(capes).values({
          hash: hash!,
          data: imageBuffer.toString('base64'), // Store base64 as backup
          width: validation.width!,
          height: validation.height!,
          uploadedBy: userId,
          isPublic: true
        }).returning()

        existingCape = newCape

        authLogger.info({
          action: 'cape_stored',
          hash: hash!.substring(0, 8) + '...',
          dimensions: `${validation.width}x${validation.height}`
        }, 'New cape stored successfully')
      } else {
        authLogger.info({
          action: 'cape_deduplicated',
          hash: hash!.substring(0, 8) + '...'
        }, 'Cape already exists, using existing file')
      }

      // Update profile with new cape
      const capeUrl = getTextureURL(this.BASE_URL, hash!)
      
      await db.update(profiles)
        .set({
          capeUrl,
          capeHash: hash!,
          updatedAt: new Date()
        })
        .where(eq(profiles.id, formattedUuid))

      authLogger.info({
        action: 'cape_upload_success',
        profileId: formattedUuid,
        capeHash: hash!.substring(0, 8) + '...'
      }, 'Cape uploaded and applied to profile')

      return {
        hash: hash!,
        url: capeUrl,
        message: 'Cape uploaded successfully'
      }

    } catch (error: any) {
      authLogger.error({
        action: 'cape_upload_error',
        error: error.message,
        profileId
      }, 'Cape upload failed')
      throw error
    }
  }

  /**
   * Remove cape from profile
   */
  static async removeCape(
    profileId: string,
    accessToken?: string
  ): Promise<{ message: string }> {
    
    authLogger.info({
      action: 'cape_remove_request',
      profileId: profileId.substring(0, 8) + '...'
    }, 'Cape removal request received')

    try {
      if (!validateUUID(profileId)) {
        throw ERRORS.INVALID_UUID
      }

      const formattedUuid = formatUUID(profileId)

      // Validate access
      if (accessToken) {
        const hasPermission = await this.validateProfileAccess(accessToken, formattedUuid)
        if (!hasPermission) {
          throw ERRORS.INVALID_PROFILE
        }
      }

      // Get profile
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, formattedUuid)
      })

      if (!profile) {
        throw ERRORS.PROFILE_NOT_FOUND
      }

      // Remove cape from profile (set to null)
      await db.update(profiles)
        .set({
          capeUrl: null,
          capeHash: null,
          updatedAt: new Date()
        })
        .where(eq(profiles.id, formattedUuid))

      authLogger.info({
        action: 'cape_remove_success',
        profileId: formattedUuid
      }, 'Cape removed from profile')

      return {
        message: 'Cape removed successfully'
      }

    } catch (error: any) {
      authLogger.error({
        action: 'cape_remove_error',
        error: error.message,
        profileId
      }, 'Cape removal failed')
      throw error
    }
  }

  /**
   * Get cape information
   */
  static async getCapeInfo(profileId: string): Promise<CapeInfo | null> {
    try {
      if (!validateUUID(profileId)) {
        return null
      }

      const formattedUuid = formatUUID(profileId)
      
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, formattedUuid)
      })

      if (!profile || !profile.capeHash) {
        return null
      }

      const cape = await db.query.capes.findFirst({
        where: eq(capes.hash, profile.capeHash)
      })

      if (!cape) {
        return null
      }

      return {
        hash: cape.hash,
        url: profile.capeUrl!,
        width: cape.width!,
        height: cape.height!,
        uploadedAt: cape.createdAt!
      }

    } catch (error: any) {
      authLogger.error({
        action: 'get_cape_info_error',
        error: error.message,
        profileId
      }, 'Failed to get cape info')
      return null
    }
  }

  /**
   * Validate that user has access to modify profile
   */
  private static async validateProfileAccess(
    accessToken: string,
    profileId: string
  ): Promise<boolean> {
    try {
      const token = await db.query.accessTokens.findFirst({
        where: and(
          eq(accessTokens.accessToken, accessToken),
          eq(accessTokens.isActive, true)
        ),
        with: {
          user: {
            with: {
              profiles: true
            }
          }
        }
      })

      if (!token || !token.user) {
        return false
      }

      // Check if profile belongs to this user
      return token.user.profiles.some(profile => profile.id === profileId)

    } catch {
      return false
    }
  }

  /**
   * Ensure directory exists for file storage
   */
  private static async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    try {
      await Bun.write(join(dir, '.gitkeep'), '')
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Get all capes for admin/debug purposes
   */
  static async getAllCapes(limit: number = 50): Promise<any[]> {
    try {
      const allCapes = await db.query.capes.findMany({
        limit,
        with: {
          uploadedBy: {
            columns: {
              id: true,
              username: true
            }
          }
        }
      })

      return allCapes.map(cape => ({
        hash: cape.hash,
        dimensions: `${cape.width}x${cape.height}`,
        uploadedBy: cape.uploadedBy?.username || 'Unknown',
        uploadedAt: cape.createdAt,
        isPublic: cape.isPublic
      }))

    } catch (error: any) {
      authLogger.error({
        action: 'get_all_capes_error',
        error: error.message
      }, 'Failed to get capes list')
      return []
    }
  }
}