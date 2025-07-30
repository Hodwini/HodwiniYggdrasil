import type { Context } from "elysia";
import { SessionService } from "@/services/session.service";
import { 
  JoinSchema, 
  HasJoinedSchema,
  type YggdrasilError 
} from "@/types/yggdrasil.types";

/**
 * POST /sessionserver/session/minecraft/join
 * Player joins server - stores session data
 */
export const joinHandler = async ({ body, set, headers }: Context) => {
    try {
        // Validate request body with Zod
        const validatedData = JoinSchema.parse(body)
        const { accessToken, selectedProfile, serverId } = validatedData

        // Get IP from headers (optional)
        const forwarded = headers["x-forwarded-for"]
        const realIp = headers["x-real-ip"]
        
        let ip: string | undefined
        if (forwarded && typeof forwarded === 'string') {
            const ips = forwarded.split(',')
            ip = ips.length > 0 ? ips[0]?.trim() : undefined
        } else if (realIp && typeof realIp === 'string') {
            ip = realIp
        }

        await SessionService.join(
            accessToken,
            selectedProfile,
            serverId,
            ip
        )

        set.status = 204 // No Content - success
        return

    } catch (error: any) {
        console.error("[SessionServer] Join error:", error)
        
        if (error?.name === "ZodError") {
            set.status = 400
            return {
                error: "IllegalArgumentException",
                errorMessage: "Invalid request format or missing required fields.",
                details: error.issues?.map((issue: any) => issue.message).join(", ")
            }
        }

        set.status = 403
        return {
            error: error?.error || "ForbiddenOperationException",
            errorMessage: error?.errorMessage || "Invalid session.",
            cause: error?.cause
        } as YggdrasilError
    }
}

/**
 * GET /sessionserver/session/minecraft/hasJoined
 * Server checks if player has joined
 */
export const hasJoinedHandler = async ({ query, set }: Context) => {
    try {
        // Validate query parameters
        const validatedQuery = HasJoinedSchema.parse(query)
        const { username, serverId, ip } = validatedQuery

        const profile = await SessionService.hasJoined(
            username,
            serverId,
            ip
        )

        if (!profile) {
            set.status = 204 // No Content - player hasn't joined
            return
        }

        set.status = 200
        return profile

    } catch (error: any) {
        console.error("[SessionServer] HasJoined error:", error)
        
        if (error?.name === "ZodError") {
            set.status = 400
            return {
                error: "IllegalArgumentException",
                errorMessage: "Invalid query parameters.",
                details: error.issues?.map((issue: any) => issue.message).join(", ")
            }
        }

        set.status = 400
        return {
            error: "IllegalArgumentException",
            errorMessage: "Bad request."
        }
    }
}

/**
 * GET /sessionserver/session/minecraft/profile/{uuid}
 * Get player profile by UUID
 */
export const profileHandler = async ({ params, query, set }: Context) => {
    try {
        const { uuid } = params
        const { unsigned } = query

        // Basic UUID validation
        if (!uuid || !/^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
            set.status = 400
            return {
                error: "IllegalArgumentException",
                errorMessage: "Invalid UUID format."
            }
        }

        const isUnsigned = typeof unsigned === 'string' 
            ? unsigned === 'true' 
            : Boolean(unsigned)

        const profile = await SessionService.getProfile(
            uuid,
            isUnsigned
        )

        if (!profile) {
            set.status = 204 // No Content - profile not found or not public
            return
        }

        set.status = 200
        return profile

    } catch (error: any) {
        console.error("[SessionServer] Profile error:", error)
        
        set.status = 400
        return {
            error: "IllegalArgumentException",
            errorMessage: "Invalid request."
        }
    }
}