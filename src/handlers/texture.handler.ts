import type { Context } from "elysia";
import { SkinService } from "@/services/skin.service";
import { CapeService } from "@/services/cape.service";
import { validateUUID } from "@/types/yggdrasil.types";
import { apiLogger, logError } from "@/utils/logger";
import { join } from "path";

/**
 * POST /api/user/profile/{uuid}/skin
 * Upload skin for a profile
 */
export const uploadSkinHandler = async ({ params, body, headers, set }: Context) => {
  try {
    const { uuid } = params
    const authHeader = headers.authorization
    const accessToken = authHeader?.replace('Bearer ', '')

    apiLogger.info({
      action: 'skin_upload_request',
      profileId: uuid || 'unknown',
      hasAuth: !!accessToken,
      contentType: headers['content-type']
    }, 'Skin upload request received')

    // Validate UUID
    if (!uuid || !validateUUID(uuid)) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "Invalid UUID format"
      }
    }

    // Check if body contains file data
    if (!body || !(body instanceof Uint8Array || Buffer.isBuffer(body))) {
      set.status = 400
      return {
        error: "IllegalArgumentException", 
        errorMessage: "No image data provided. Send PNG file as request body."
      }
    }

    const imageBuffer = Buffer.from(body)

    // Check minimum file size
    if (imageBuffer.length < 100) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "File too small to be a valid image"
      }
    }

    // Upload skin
    const result = await SkinService.uploadSkin(
      uuid,
      imageBuffer,
      undefined, // userId will be extracted from token in service
      accessToken
    )

    set.status = 200
    return result

  } catch (error: any) {
    logError(error, 'uploadSkinHandler')
    
    if (error.error) {
      set.status = error.error === 'IllegalArgumentException' ? 400 : 403
      return {
        error: error.error,
        errorMessage: error.errorMessage
      }
    }

    set.status = 500
    return {
      error: "InternalServerError",
      errorMessage: "Failed to upload skin"
    }
  }
}

/**
 * DELETE /api/user/profile/{uuid}/skin
 * Remove skin from profile  
 */
export const removeSkinHandler = async ({ params, headers, set }: Context) => {
  try {
    const { uuid } = params
    const authHeader = headers.authorization
    const accessToken = authHeader?.replace('Bearer ', '')

    apiLogger.info({
      action: 'skin_remove_request',
      profileId: uuid || 'unknown',
      hasAuth: !!accessToken
    }, 'Skin removal request received')

    if (!uuid || !validateUUID(uuid)) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "Invalid UUID format"
      }
    }

    const result = await SkinService.removeSkin(uuid, accessToken)

    set.status = 200
    return result

  } catch (error: any) {
    logError(error, 'removeSkinHandler')
    
    if (error.error) {
      set.status = error.error === 'IllegalArgumentException' ? 400 : 403
      return {
        error: error.error,
        errorMessage: error.errorMessage
      }
    }

    set.status = 500
    return {
      error: "InternalServerError", 
      errorMessage: "Failed to remove skin"
    }
  }
}

/**
 * POST /api/user/profile/{uuid}/cape
 * Upload cape for a profile
 */
export const uploadCapeHandler = async ({ params, body, headers, set }: Context) => {
  try {
    const { uuid } = params
    const authHeader = headers.authorization
    const accessToken = authHeader?.replace('Bearer ', '')

    apiLogger.info({
      action: 'cape_upload_request',
      profileId: uuid || 'unknown',
      hasAuth: !!accessToken,
      contentType: headers['content-type']
    }, 'Cape upload request received')

    // Validate UUID
    if (!uuid || !validateUUID(uuid)) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "Invalid UUID format"
      }
    }

    // Check if body contains file data
    if (!body || !(body instanceof Uint8Array || Buffer.isBuffer(body))) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "No image data provided. Send PNG file as request body."
      }
    }

    const imageBuffer = Buffer.from(body)

    // Check minimum file size
    if (imageBuffer.length < 100) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "File too small to be a valid image"
      }
    }

    // Upload cape
    const result = await CapeService.uploadCape(
      uuid,
      imageBuffer,
      undefined, // userId will be extracted from token in service
      accessToken
    )

    set.status = 200
    return result

  } catch (error: any) {
    logError(error, 'uploadCapeHandler')
    
    if (error.error) {
      set.status = error.error === 'IllegalArgumentException' ? 400 : 403
      return {
        error: error.error,
        errorMessage: error.errorMessage
      }
    }

    set.status = 500
    return {
      error: "InternalServerError",
      errorMessage: "Failed to upload cape"
    }
  }
}

/**
 * DELETE /api/user/profile/{uuid}/cape
 * Remove cape from profile
 */
export const removeCapeHandler = async ({ params, headers, set }: Context) => {
  try {
    const { uuid } = params
    const authHeader = headers.authorization
    const accessToken = authHeader?.replace('Bearer ', '')

    apiLogger.info({
      action: 'cape_remove_request',
      profileId: uuid || 'unknown',
      hasAuth: !!accessToken
    }, 'Cape removal request received')

    if (!uuid || !validateUUID(uuid)) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "Invalid UUID format"
      }
    }

    const result = await CapeService.removeCape(uuid, accessToken)

    set.status = 200
    return result

  } catch (error: any) {
    logError(error, 'removeCapeHandler')
    
    if (error.error) {
      set.status = error.error === 'IllegalArgumentException' ? 400 : 403
      return {
        error: error.error,
        errorMessage: error.errorMessage
      }
    }

    set.status = 500
    return {
      error: "InternalServerError",
      errorMessage: "Failed to remove cape"
    }
  }
}

/**
 * GET /api/user/profile/{uuid}/skin
 * Get skin info for profile
 */
export const getSkinInfoHandler = async ({ params, set }: Context) => {
  try {
    const { uuid } = params

    if (!uuid || !validateUUID(uuid)) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "Invalid UUID format"
      }
    }

    const skinInfo = await SkinService.getSkinInfo(uuid)

    if (!skinInfo) {
      set.status = 404
      return {
        error: "NoSuchProfileException",
        errorMessage: "Profile has no skin or profile not found"
      }
    }

    set.status = 200
    return skinInfo

  } catch (error: any) {
    logError(error, 'getSkinInfoHandler')
    
    set.status = 500
    return {
      error: "InternalServerError",
      errorMessage: "Failed to get skin info"
    }
  }
}

/**
 * GET /api/user/profile/{uuid}/cape
 * Get cape info for profile
 */
export const getCapeInfoHandler = async ({ params, set }: Context) => {
  try {
    const { uuid } = params

    if (!uuid || !validateUUID(uuid)) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "Invalid UUID format"
      }
    }

    const capeInfo = await CapeService.getCapeInfo(uuid)

    if (!capeInfo) {
      set.status = 404
      return {
        error: "NoSuchProfileException",
        errorMessage: "Profile has no cape or profile not found"
      }
    }

    set.status = 200
    return capeInfo

  } catch (error: any) {
    logError(error, 'getCapeInfoHandler')
    
    set.status = 500
    return {
      error: "InternalServerError",
      errorMessage: "Failed to get cape info"
    }
  }
}

/**
 * GET /textures/{hash}
 * Serve texture file by hash
 */
export const serveTextureHandler = async ({ params, set }: Context) => {
  try {
    const { hash } = params

    // Validate hash exists and format (64 character hex string)
    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
      set.status = 400
      return {
        error: "IllegalArgumentException",
        errorMessage: "Invalid texture hash format"
      }
    }

    // Try to find file in both skin and cape directories
    const skinPath = join('public/textures/skin', hash.slice(0, 2), `${hash}.png`)
    const capePath = join('public/textures/cape', hash.slice(0, 2), `${hash}.png`)

    let filePath: string | null = null
    
    // Check if skin file exists
    try {
      const skinFile = Bun.file(skinPath)
      if (await skinFile.exists()) {
        filePath = skinPath
      }
    } catch {}

    // Check if cape file exists
    if (!filePath) {
      try {
        const capeFile = Bun.file(capePath)
        if (await capeFile.exists()) {
          filePath = capePath
        }
      } catch {}
    }

    if (!filePath) {
      set.status = 404
      return {
        error: "NoSuchTextureException",
        errorMessage: "Texture not found"
      }
    }

    // Serve the file
    const file = Bun.file(filePath)
    const arrayBuffer = await file.arrayBuffer()

    // Set proper headers
    set.headers = {
      'Content-Type': 'image/png',
      'Content-Length': arrayBuffer.byteLength.toString(),
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'ETag': `"${hash}"`,
      'Last-Modified': new Date().toUTCString()
    }

    set.status = 200
    return new Uint8Array(arrayBuffer)

  } catch (error: any) {
    logError(error, 'serveTextureHandler')
    
    set.status = 500
    return {
      error: "InternalServerError",
      errorMessage: "Failed to serve texture"
    }
  }
}