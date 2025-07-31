import { eq, and } from "drizzle-orm";
import { join } from "path";
import {db, profiles, skins, accessTokens } from "@/database";
import { ERRORS, formatUUID, validateUUID } from "@/types/yggdrasil.types";
import { validateTexture, getTextureStoragePath, getTextureURL } from "@/utils/image";
import { authLogger } from "@/utils/logger";

export interface SkinUploadResult {
  hash: string
  url: string
  model: string
  message: string
}

export interface TextureInfo {
  hash: string
  url: string
  width: number
  height: number
  model?: string
  uploadedAt: Date
}

export class SkinService {
  private static readonly TEXTURES_DIR = 'public/textures'
  private static readonly BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

  /**
   * Upload skin for a profile
   */
  static async uploadSkin(
    profileId: string,
    imageBuffer: Buffer,
    userId?: string,
    accessToken?: string
  ): Promise<SkinUploadResult> {
    
    authLogger.info({
      action: 'skin_upload_request',
      profileId: profileId.substring(0, 8) + '...',
      fileSize: imageBuffer.length
    }, 'Skin upload request received')

    try {
      // Validate UUID format
      if (!validateUUID(profileId)) {
        throw ERRORS.INVALID_UUID
      }

      const formattedUuid = formatUUID(profileId)

      // Validate and process image
      const validation = validateTexture(imageBuffer, 'skin')
      if (!validation.isValid) {
        authLogger.warn({
          action: 'skin_upload_failed',
          reason: 'invalid_image',
          error: validation.error
        }, 'Skin validation failed')
        throw {
          error: 'IllegalArgumentException',
          errorMessage: validation.error || 'Invalid skin image'
        }
      }

      const { hash, model } = validation

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

      // Check if skin already exists (deduplication)
      let existingSkin = await db.query.skins.findFirst({
        where: eq(skins.hash, hash!)
      })

      if (!existingSkin) {
        // Store new skin file
        const storagePath = getTextureStoragePath(hash!, 'skin')
        const fullPath = join(this.TEXTURES_DIR, storagePath)
        
        // Ensure directory exists
        await this.ensureDirectoryExists(fullPath)
        
        // Write file
        await Bun.write(fullPath, imageBuffer)

        // Save skin metadata to database
        const [newSkin] = await db.insert(skins).values({
          hash: hash!,
          data: imageBuffer.toString('base64'), // Store base64 as backup
          model,
          width: validation.width!,
          height: validation.height!,
          uploadedBy: userId,
          isPublic: true
        }).returning()

        existingSkin = newSkin

        authLogger.info({
          action: 'skin_stored',
          hash: hash!.substring(0, 8) + '...',
          model,
          dimensions: `${validation.width}x${validation.height}`
        }, 'New skin stored successfully')
      } else {
        authLogger.info({
          action: 'skin_deduplicated',
          hash: hash!.substring(0, 8) + '...'
        }, 'Skin already exists, using existing file')
      }

      // Update profile with new skin
      const skinUrl = getTextureURL(this.BASE_URL, hash!)
      
      await db.update(profiles)
        .set({
          skinUrl,
          skinHash: hash!,
          skinModel: model,
          updatedAt: new Date()
        })
        .where(eq(profiles.id, formattedUuid))

      authLogger.info({
        action: 'skin_upload_success',
        profileId: formattedUuid,
        skinHash: hash!.substring(0, 8) + '...',
        model
      }, 'Skin uploaded and applied to profile')

      return {
        hash: hash!,
        url: skinUrl,
        model: model!,
        message: 'Skin uploaded successfully'
      }

    } catch (error: any) {
      authLogger.error({
        action: 'skin_upload_error',
        error: error.message,
        profileId
      }, 'Skin upload failed')
      throw error
    }
  }

  /**
   * Remove skin from profile
   */
  static async removeSkin(
    profileId: string,
    accessToken?: string
  ): Promise<{ message: string }> {
    
    authLogger.info({
      action: 'skin_remove_request',
      profileId: profileId.substring(0, 8) + '...'
    }, 'Skin removal request received')

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

      // Remove skin from profile (set to null)
      await db.update(profiles)
        .set({
          skinUrl: null,
          skinHash: null,
          skinModel: 'steve', // Default to Steve
          updatedAt: new Date()
        })
        .where(eq(profiles.id, formattedUuid))

      authLogger.info({
        action: 'skin_remove_success',
        profileId: formattedUuid
      }, 'Skin removed from profile')

      return {
        message: 'Skin removed successfully'
      }

    } catch (error: any) {
      authLogger.error({
        action: 'skin_remove_error',
        error: error.message,
        profileId
      }, 'Skin removal failed')
      throw error
    }
  }

  /**
   * Get skin information
   */
  static async getSkinInfo(profileId: string): Promise<TextureInfo | null> {
    try {
      if (!validateUUID(profileId)) {
        return null
      }

      const formattedUuid = formatUUID(profileId)
      
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, formattedUuid)
      })

      if (!profile || !profile.skinHash) {
        return null
      }

      const skin = await db.query.skins.findFirst({
        where: eq(skins.hash, profile.skinHash)
      })

      if (!skin) {
        return null
      }

      return {
        hash: skin.hash,
        url: profile.skinUrl!,
        width: skin.width!,
        height: skin.height!,
        model: skin.model ?? undefined,
        uploadedAt: skin.createdAt!
      }

    } catch (error: any) {
      authLogger.error({
        action: 'get_skin_info_error',
        error: error.message,
        profileId
      }, 'Failed to get skin info')
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
   * Get all skins for admin/debug purposes
   */
  static async getAllSkins(limit: number = 50): Promise<any[]> {
    try {
      const allSkins = await db.query.skins.findMany({
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

      return allSkins.map(skin => ({
        hash: skin.hash,
        model: skin.model,
        dimensions: `${skin.width}x${skin.height}`,
        uploadedBy: skin.uploadedBy?.username || 'Unknown',
        uploadedAt: skin.createdAt,
        isPublic: skin.isPublic
      }))

    } catch (error: any) {
      authLogger.error({
        action: 'get_all_skins_error',
        error: error.message
      }, 'Failed to get skins list')
      return []
    }
  }
}