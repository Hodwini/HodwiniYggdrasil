import { eq, and, gt } from 'drizzle-orm'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { db, users, profiles, accessTokens } from '../database'
import type { AuthenticateResponse, RefreshResponse } from '../types/yggdrasil'
import { ERRORS, stripUUID } from '../types/yggdrasil'

export class AuthService {
  
  static async authenticate(
    username: string,
    password: string,
    clientToken?: string,
    requestUser?: boolean
  ): Promise<RefreshResponse> {
    
    // Найти пользователя
    const user = await db.query.users.findFirst({
      where: eq(users.email, username),
      with: { profiles: true }
    })

    if (!user || !user.isActive) {
      throw ERRORS.INVALID_CREDENTIALS
    }

    // Проверить пароль
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      throw ERRORS.INVALID_CREDENTIALS
    }

    // Генерация токенов
    const accessToken = crypto.randomBytes(32).toString('hex')
    const finalClientToken = clientToken || crypto.randomUUID()
    
    const selectedProfile = user.profiles[0]
    
    // Сохранить токен
    await db.insert(accessTokens).values({
      userId: user.id,
      profileId: selectedProfile?.id,
      accessToken,
      clientToken: finalClientToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
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

  static async refresh(
    accessToken: string,
    clientToken: string,
    requestUser?: boolean
  ): Promise<AuthenticateResponse> {
    
    const token = await db.query.accessTokens.findFirst({
      where: and(
        eq(accessTokens.accessToken, accessToken),
        eq(accessTokens.clientToken, clientToken),
        eq(accessTokens.isActive, true),
        gt(accessTokens.expiresAt, new Date())
      ),
      with: {
        user: true,
        profile: true
      }
    })

    if (!token) {
      throw ERRORS.INVALID_TOKEN
    }

    const newAccessToken = crypto.randomBytes(32).toString('hex')
    
    await db.update(accessTokens)
      .set({
        accessToken: newAccessToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastUsedAt: new Date()
      })
      .where(eq(accessTokens.id, token.id))

    return {
      accessToken: newAccessToken,
      clientToken,
      selectedProfile: token.profile ? {
        id: stripUUID(token.profile.id),
        name: token.profile.name
      } : undefined,
      user: requestUser && token.user ? {
        id: stripUUID(token.user.id),
        username: token.user.email
      } : undefined
    }
  }

  static async validate(accessToken: string, clientToken?: string): Promise<boolean> {
    const token = await db.query.accessTokens.findFirst({
      where: and(
        eq(accessTokens.accessToken, accessToken),
        clientToken ? eq(accessTokens.clientToken, clientToken) : undefined,
        eq(accessTokens.isActive, true),
        gt(accessTokens.expiresAt, new Date())
      )
    })

    return !!token
  }

  static async invalidate(accessToken: string, clientToken: string): Promise<void> {
    await db.update(accessTokens)
      .set({ isActive: false })
      .where(and(
        eq(accessTokens.accessToken, accessToken),
        eq(accessTokens.clientToken, clientToken)
      ))
  }

  static async signout(username: string, password: string): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, username)
    })

    if (!user) {
      throw ERRORS.INVALID_CREDENTIALS
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      throw ERRORS.INVALID_CREDENTIALS
    }

    await db.update(accessTokens)
      .set({ isActive: false })
      .where(eq(accessTokens.userId, user.id))
  }
}