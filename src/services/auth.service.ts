import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomUUIDv7 } from "bun";
import { users, profiles } from "@/database";
import { db } from "@/database";
import type 
{ 
    AuthenticateRequest, 
    AuthenticateResponse, 
    Profile, 
    Property, 
    User 
} from "@/shared/interfaces/yggdrasil";

export class AuthService {
  // ===================================
  // YGGDRASIL API METHODS
  // ===================================

  async authenticate(request: AuthenticateRequest): Promise<AuthenticateResponse> {
    const { username, password, clientToken, requestUser } = request;

    // Проверяем пользователя
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      throw new Error('Invalid credentials');
    }

    // Получаем профиль пользователя
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    if (!profile) {
      throw new Error('No profile found');
    }

    // Создаём сессию
    const accessToken = this.generateAccessToken();
    const finalClientToken = clientToken || randomUUID();

    await db.insert(sessions).values({
      accessToken,
      clientToken: finalClientToken,
      profileId: profile.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
    });

    // Получаем текстуры для профиля
    const properties = await this.getProfileProperties(profile.id);

    const response: AuthenticateResponse = {
      accessToken,
      clientToken: finalClientToken,
      availableProfiles: [{
        id: profile.id,
        name: profile.name,
        properties
      }],
      selectedProfile: {
        id: profile.id,
        name: profile.name,
        properties
      }
    };

    if (requestUser) {
      response.user = {
        id: user.id,
        username: user.username
      };
    }

    return response;
  }

  async refresh(accessToken: string, clientToken: string): Promise<AuthenticateResponse> {
    // Проверяем сессию
    const [session] = await db.select()
      .from(sessions)
      .where(and(
        eq(sessions.accessToken, accessToken),
        eq(sessions.clientToken, clientToken)
      ))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid token');
    }

    // Получаем профиль
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.id, session.profileId))
      .limit(1);

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Генерируем новый токен
    const newAccessToken = this.generateAccessToken();
    
    await db.update(sessions)
      .set({
        accessToken: newAccessToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
      .where(eq(sessions.accessToken, accessToken));

    const properties = await this.getProfileProperties(profile.id);

    return {
      accessToken: newAccessToken,
      clientToken,
      availableProfiles: [{
        id: profile.id,
        name: profile.name,
        properties
      }],
      selectedProfile: {
        id: profile.id,
        name: profile.name,
        properties
      }
    };
  }

  async validate(accessToken: string, clientToken: string): Promise<void> {
    const [session] = await db.select()
      .from(sessions)
      .where(and(
        eq(sessions.accessToken, accessToken),
        eq(sessions.clientToken, clientToken)
      ))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid token');
    }
  }

  async invalidate(accessToken: string, clientToken: string): Promise<void> {
    await db.delete(sessions)
      .where(and(
        eq(sessions.accessToken, accessToken),
        eq(sessions.clientToken, clientToken)
      ));
  }

  async signout(username: string, password: string): Promise<void> {
    // Проверяем пользователя
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      throw new Error('Invalid credentials');
    }

    // Удаляем все сессии пользователя
    const userProfiles = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, user.id));

    const profileIds = userProfiles.map(p => p.id);

    if (profileIds.length > 0) {
      await db.delete(sessions)
        .where(eq(sessions.profileId, profileIds[0])); // Упрощённо для одного профиля
    }
  }

  // ===================================
  // SESSION SERVER METHODS
  // ===================================

  async joinServer(accessToken: string, selectedProfile: string, serverId: string): Promise<void> {
    // Проверяем сессию
    const [session] = await db.select()
      .from(sessions)
      .where(eq(sessions.accessToken, accessToken))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    // Проверяем что профиль соответствует сессии
    if (session.profileId !== selectedProfile) {
      throw new Error('Profile mismatch');
    }

    // Здесь можно сохранить serverId для hasJoined проверки
    // Пока упрощённо
  }

  async hasJoined(username: string, serverId: string): Promise<Profile | null> {
    // Получаем профиль по имени
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.name, username))
      .limit(1);

    if (!profile) {
      return null;
    }

    // Проверяем что у пользователя есть активная сессия
    const [session] = await db.select()
      .from(sessions)
      .where(and(
        eq(sessions.profileId, profile.id),
        // Можно добавить проверку serverId
      ))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const properties = await this.getProfileProperties(profile.id);

    return {
      id: profile.id,
      name: profile.name,
      properties
    };
  }

  async getProfileWithTextures(profileId: string): Promise<Profile | null> {
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    if (!profile) {
      return null;
    }

    const properties = await this.getProfileProperties(profile.id);

    return {
      id: profile.id,
      name: profile.name,
      properties
    };
  }

  // ===================================
  // HELPER METHODS
  // ===================================

  private async getProfileProperties(profileId: string): Promise<Property[]> {
    // Получаем активные текстуры для профиля
    const textures = await this.getActiveTextures(profileId);
    
    if (!textures.skin && !textures.cape) {
      return [];
    }

    const textureData = {
      timestamp: Date.now(),
      profileId,
      profileName: textures.profileName,
      textures: {
        ...(textures.skin && {
          SKIN: {
            url: `${appConfig.BASE_URL}/textures/skin/${textures.profileName}.png`,
            metadata: { model: 'steve' } // TODO: определять из метаданных
          }
        }),
        ...(textures.cape && {
          CAPE: {
            url: `${appConfig.BASE_URL}/textures/cape/${textures.profileName}.png`
          }
        })
      }
    };

    const textureValue = Buffer.from(JSON.stringify(textureData)).toString('base64');

    return [{
      name: 'textures',
      value: textureValue
      // signature: this.signTextures(textureValue) // TODO: реализовать подпись
    }];
  }

  private async getActiveTextures(profileId: string) {
    // TODO: реализовать получение активных текстур из БД
    // Пока заглушка
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    return {
      profileName: profile?.name,
      skin: null, // TODO: получить из таблицы textures
      cape: null  // TODO: получить из таблицы textures
    };
  }

  private generateAccessToken(): string {
    return randomUUID().replace(/-/g, '');
  }

  // ===================================
  // USER MANAGEMENT
  // ===================================

  async createUser(username: string, email: string, password: string): Promise<{ userId: string; profileId: string }> {
    const passwordHash = await bcrypt.hash(password, appConfig.BCRYPT_ROUNDS || 12);

    // Создаём пользователя
    const [user] = await db.insert(users).values({
      username,
      email,
      passwordHash
    }).returning();

    // Создаём профиль с тем же именем
    const [profile] = await db.insert(profiles).values({
      userId: user.id,
      name: username
    }).returning();

    return {
      userId: user.id,
      profileId: profile.id
    };
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return user;
  }

  async getProfileByName(name: string) {
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.name, name))
      .limit(1);

    return profile;
  }
}