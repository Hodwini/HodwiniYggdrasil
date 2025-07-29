import { Elysia } from "elysia";
import {
    registerHandler,
    authenticateHandler,
    refreshHandler,
    validateHandler,
    invalidateHandler,
    signoutHandler
} from "@/handlers/auth.handler"

export const authServerRoutes = new Elysia({ prefix: '/authserver' })
  // Global error handler
  .onError(({ code, error, set }) => {
    console.error('Auth Server Error:', error)
    
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

  // POST /authserver/register
  .post('/register', registerHandler, {
    detail: {
      summary: 'Register new user',
      description: 'Register new user with email, username, password and profile name',
      tags: ['Authentication']
    }
  })

  // POST /authserver/authenticate
  .post('/authenticate', authenticateHandler, {
    detail: {
      summary: 'Authenticate user',
      description: 'Authenticate user with username and password',
      tags: ['Authentication']
    }
  })

  // POST /authserver/refresh
  .post('/refresh', refreshHandler, {
    detail: {
      summary: 'Refresh access token',
      description: 'Refresh access token using existing tokens',
      tags: ['Authentication']
    }
  })

  // POST /authserver/validate
  .post('/validate', validateHandler, {
    detail: {
      summary: 'Validate access token',
      description: 'Check if access token is valid',
      tags: ['Authentication']
    }
  })

  // POST /authserver/invalidate
  .post('/invalidate', invalidateHandler, {
    detail: {
      summary: 'Invalidate access token',
      description: 'Invalidate specific access token',
      tags: ['Authentication']
    }
  })

  // POST /authserver/signout
  .post('/signout', signoutHandler, {
    detail: {
      summary: 'Sign out user',
      description: 'Sign out user and invalidate all tokens',
      tags: ['Authentication']
    }
  })