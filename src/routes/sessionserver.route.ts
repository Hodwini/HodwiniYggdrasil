import { Elysia } from "elysia";
import {
    joinHandler,
    hasJoinedHandler,
    profileHandler
} from "@/handlers/session.handler";

export const sessionServerRoutes = new Elysia({ prefix: '/sessionserver' })
  // Global error handler
  .onError(({ code, error, set }) => {
    console.error('Session Server Error:', error)
    
    if (code === 'VALIDATION') {
      set.status = 400
      return {
        error: 'IllegalArgumentException',
        errorMessage: 'Invalid request format or missing required fields.'
      }
    }
    
    set.status = 500
    return {
      error: 'InternalServerError',
      errorMessage: 'An unexpected error occurred'
    }
  })

  // POST /sessionserver/session/minecraft/join
  .post('/session/minecraft/join', joinHandler, {
    detail: {
      summary: 'Player joins server',
      description: 'Called by Minecraft client when joining a server',
      tags: ['Session Server']
    }
  })

  // GET /sessionserver/session/minecraft/hasJoined
  .get('/session/minecraft/hasJoined', hasJoinedHandler, {
    detail: {
      summary: 'Check if player joined',
      description: 'Called by Minecraft server to verify player authentication',
      tags: ['Session Server']
    }
  })

  // GET /sessionserver/session/minecraft/profile/{uuid}
  .get('/session/minecraft/profile/:uuid', profileHandler, {
    detail: {
      summary: 'Get player profile',
      description: 'Get player profile with textures by UUID',
      tags: ['Session Server']
    }
  })