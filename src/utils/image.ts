import crypto from "crypto";
import { join } from "path";

/**
 * Image skin validation and processing utilities
 */
export interface ImageValidationResult {
    isValid: boolean
    width?: number
    height?: number
    format?: string
    error?: string
}

export interface SkinAnalysis {
    model: 'steve' | 'alex'
    isSlim: boolean
}

/**
 * Validate PNG header and basic structure
 */
export function validatePNG(buffer: Buffer): boolean {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

    if (buffer.length < 8) return false

    return buffer.subarray(0, 8).equals(pngSignature)
}

/**
 * Get image dimensions from PNG buffer
 */
export function getPNGDimensions(buffer: Buffer): { width: number; height: number } | null {
    if (!validatePNG(buffer)) return null

    try {
        // PNG IHDR chunk starts at byte 16, dimensions at bytes 16-23
        if (buffer.length <24) return null

        const width = buffer.readUInt32BE(16)
        const height = buffer.readUInt32BE(20)

        return { width, height }
    } catch {
        return null
    }
}

/**
 * Validate skin image (64x64 or 64x32 for legacy)
 */
export function validateSkinImage(buffer: Buffer): ImageValidationResult {
    if (!validatePNG(buffer)) {
        return { isValid: false, error: 'Not a valid PNG file' }
    }

    const dimensions = getPNGDimensions(buffer)
    if (!dimensions) {
        return { isValid: false, error: 'Could not read image dimensions'}
    }

    const { width, height } = dimensions

    // Standard Minecraft skin: 64x64, Legacy: 64x32
    if (width === 64 && (height === 64 || height === 32)) {
        return {
            isValid: true,
            width,
            height,
            format: 'PNG'
        }
    }

    return {
        isValid: false,
        width,
        height,
        error: `Invalid skin dimensions: ${width}x${height}. Expected 64x64 or 64x32`
    }
}

/**
 * Validate cape image(64x32)
 */
export function validateCapeImage(buffer: Buffer): ImageValidationResult {
  if (!validatePNG(buffer)) {
    return { isValid: false, error: 'Not a valid PNG file' }
  }
  
  const dimensions = getPNGDimensions(buffer)
  if (!dimensions) {
    return { isValid: false, error: 'Could not read image dimensions' }
  }
  
  const { width, height } = dimensions
  
  // Standard Minecraft cape: 64x32
  if (width === 64 && height === 32) {
    return {
      isValid: true,
      width,
      height,
      format: 'PNG'
    }
  }
  
  return {
    isValid: false,
    width,
    height,
    error: `Invalid cape dimensions: ${width}x${height}. Expected 64x32`
  }
}

/**
 * Detect skin model (Steve vs Alex) by analyzing arm width
 * Alex skins have slim arms (3px instead of 4px)
 */
export function detectSkinModel(buffer: Buffer): SkinAnalysis {
    const dimensions = getPNGDimensions(buffer)

    // Default to Steve if we can't analyze
    if (!dimensions || dimensions.height === 32) {
        return { model: 'steve', isSlim: false }
    }

    try {
    // This is a simplified detection - in practice you'd need to:
    // 1. Parse PNG data to get pixel data
    // 2. Check the arm area for transparency
    // 3. Determine if it's 3px or 4px wide
    
    // For now, we'll use a basic heuristic based on file size
    // Alex skins tend to be smaller due to transparent pixels
    const avgBytesPerPixel = buffer.length / (dimensions.width * dimensions.height)
    
    if (avgBytesPerPixel < 3.5) {
        return { model: 'alex', isSlim: true }
    }
    
    return { model: 'steve', isSlim: false }
    } catch {
        return { model: 'steve', isSlim: false }
    }
}

/**
 * Generate SHA-256 hash for file content
 */
export function generateImageHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Get file path for storing texture by hash
 */
export function getTextureStoragePath(hash: string, type: 'skin' | 'cape'): string {
    // Storage in subdirectories for better perfomance
    const subdir = hash.slice(0, 2)
    return join ('textures', type, subdir, `${hash}.png`)
}

/**
 * Validate file size constraints
 */
export function validateFileSize(buffer: Buffer, maxSizeKB: number = 1024): boolean {
  const maxSize = maxSizeKB * 1024 // Convert to bytes
  return buffer.length <= maxSize
}

/**
 * Get texture URL for serving
 */
export function getTextureURL(baseURL: string, hash: string): string {
    return `${baseURL}/textures/${hash}`
}

/**
 * Comprehensive texture validation
 */
export function validateTexture(
    buffer: Buffer,
    type: 'skin' | 'cape'
): ImageValidationResult & { hash?: string; model?: string } {

    // File size check (max 1MB)
    if (!validateFileSize(buffer, 1024)) {
        return { isValid: false, error: 'File too large (max 1MB' }
    }

    // Image validation based on type
    const validation = type === 'skin'
        ? validateSkinImage(buffer)
        : validateCapeImage(buffer)

    if (!validation.isValid) {
        return validation
    }

    // Generate hash
    const hash = generateImageHash(buffer)

    // Detet model for skins
    let model: string | undefined
    if (type === 'skin') {
        const SkinAnalysis = detectSkinModel(buffer)
        model = SkinAnalysis.model
    }

    return {
        ...validation,
        hash,
        model
    }
}