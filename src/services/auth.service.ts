import { eq, and, gt } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { db, users, accessTokens, profiles } from '@/database'
import type { AuthenticateResponse, RefreshResponse, RegisterResponse } from '@/types/yggdrasil.types'
import { ERRORS, stripUUID } from '@/types/yggdrasil.types'
import { generateAccessToken, generateClientToken, calculateExpirationTime } from '@/utils/crypto'

export class AuthService {
  /**
   * Authenticate user with username and password
   */
  static async authenticate(
    username: string,
    password: string,
    clientToken?: string,
    requestUser?: boolean
  ): Promise<AuthenticateResponse> {
    
    // Find user by email (Yggdrasil uses email as username)
    const user = await db.query.users.findFirst({
      where: eq(users.email, username),
      with: { 
        profiles: true 
      }
    })

    if (!user || !user.isActive) {
      throw ERRORS.INVALID_CREDENTIALS
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      throw ERRORS.INVALID_CREDENTIALS
    }

    // Generate tokens
    const accessToken = generateAccessToken()
    const finalClientToken = clientToken || generateClientToken()
    const selectedProfile = user.profiles[0] // First profile as selected
    
    // Save access token to database
    await db.insert(accessTokens).values({
      userId: user.id,
      profileId: selectedProfile?.id,
      accessToken,
      clientToken: finalClientToken,
      expiresAt: calculateExpirationTime(24), // 24 hours
      isActive: true
    })

    return {
      accessToken,
      clientToken: finalClientToken,
      availableProfiles: user.profiles.map((profile) => ({
        id: stripUUID(profile.id),
        name: profile.name
      })),
      selectedProfile: selectedProfile ? {
        id: stripUUID(selectedProfile.id),
        name: selectedProfile.name
      } : undefined,
      user: requestUser ? {
        id: stripUUID(user.id),
        username: user.email
      } : undefined
    }
  }

  /**
   * Register new user with email and password
   */
  static async register(
    email: string,
    username: string,
    password: string
  ): Promise<RegisterResponse> {

    // Check if email already exists
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, email)
    })

    if (existingEmail) {
      throw ERRORS.USER_ALREADY_EXISTS
    }

    // Check if username already exists
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, username)
    })

    if (existingUsername) {
      throw ERRORS.USERNAME_TAKEN
    }

    // Check if profile name already exists (используем username как имя профиля)
    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.name, username)
    })

    if (existingProfile) {
      throw ERRORS.PROFILE_NAME_TAKEN
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const [user] = await db.insert(users).values({
      email,
      username,
      passwordHash,
      isEmailVerified: true, // For now, skip email verification
      isActive: true
    }).returning()

    if (!user) {
      throw new Error('User creation failed')
    }

    // ИСПРАВЛЕНИЕ: используем username как имя профиля (стандарт Yggdrasil)
    const [profile] = await db.insert(profiles).values({
      userId: user.id,
      name: username, // ← КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ!
      skinModel: "steve",
      isPublic: true
    }).returning()

    if (!profile) {
      throw ERRORS.PROFILE_NAME_TAKEN
    }

    return {
      message: 'User registered successfully',
      user: {
        id: stripUUID(user.id),
        email: user.email,
        username: user.username
      },
      profile: {
        id: stripUUID(profile.id),
        name: profile.name
      }
    }
  }

  /**
   * Refresh access token using existing tokens
   */
  static async refresh(
    accessToken: string,
    clientToken: string,
    requestUser?: boolean
  ): Promise<RefreshResponse> {
    
    // Find valid token
    const token = await db.query.accessTokens.findFirst({
      where: and(
        eq(accessTokens.accessToken, accessToken),
        eq(accessTokens.clientToken, clientToken),
        eq(accessTokens.isActive, true),
        gt(accessTokens.expiresAt, new Date())
      ),
      with: {
        user: {
          with: {
            profiles: true
          }
        },
        profile: true
      }
    })

    if (!token || !token.user) {
      throw ERRORS.INVALID_TOKEN
    }

    // Generate new access token
    const newAccessToken = generateAccessToken()
    
    // Update token in database
    await db.update(accessTokens)
      .set({
        accessToken: newAccessToken,
        expiresAt: calculateExpirationTime(24),
        lastUsedAt: new Date()
      })
      .where(eq(accessTokens.id, token.id))

    return {
      accessToken: newAccessToken,
      clientToken,
      availableProfiles: token.user.profiles.map((profile) => ({
        id: stripUUID(profile.id),
        name: profile.name
      })),
      selectedProfile: token.profile ? {
        id: stripUUID(token.profile.id),
        name: token.profile.name
      } : undefined,
      user: requestUser ? {
        id: stripUUID(token.user.id),
        username: token.user.email
      } : undefined
    }
  }

  /**
   * Validate access token
   */
  static async validate(
    accessToken: string, 
    clientToken?: string
  ): Promise<boolean> {
    
    const whereConditions = [
      eq(accessTokens.accessToken, accessToken),
      eq(accessTokens.isActive, true),
      gt(accessTokens.expiresAt, new Date())
    ]

    // Add client token check if provided
    if (clientToken) {
      whereConditions.push(eq(accessTokens.clientToken, clientToken))
    }

    const token = await db.query.accessTokens.findFirst({
      where: and(...whereConditions)
    })

    return !!token
  }

  /**
   * Invalidate specific access token
   */
  static async invalidate(
    accessToken: string, 
    clientToken: string
  ): Promise<void> {
    
    await db.update(accessTokens)
      .set({ 
        isActive: false 
      })
      .where(and(
        eq(accessTokens.accessToken, accessToken),
        eq(accessTokens.clientToken, clientToken)
      ))
  }

  /**
   * Sign out user (invalidate all user's tokens)
   */
  static async signout(
    username: string, 
    password: string
  ): Promise<void> {
    
    // Verify user credentials first
    const user = await db.query.users.findFirst({
      where: eq(users.email, username)
    })

    if (!user) {
      throw ERRORS.INVALID_CREDENTIALS
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      throw ERRORS.INVALID_CREDENTIALS
    }

    // Invalidate all user's tokens
    await db.update(accessTokens)
      .set({ 
        isActive: false 
      })
      .where(eq(accessTokens.userId, user.id))
  }
}