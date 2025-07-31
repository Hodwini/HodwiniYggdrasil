import { Elysia } from "elysia";
import {
    uploadSkinHandler,
    removeSkinHandler,
    uploadCapeHandler,
    removeCapeHandler,
    getSkinInfoHandler,
    getCapeInfoHandler,
    serveTextureHandler
} from "@/handlers/texture.handler";

export const apiRoutes = new Elysia({ prefix: '/api' })
    // Global error handler
  .onError(({ code, error, set }) => {
    console.error('API Error:', error)
   
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

  // POST /api/user/profile/{uuid}/skin
  .post('/user/profile/:uuid/skin', uploadSkinHandler, {
    detail: {
      summary: 'Upload skin',
      description: 'Upload PNG skin file for a profile (64x64 or 64x32)',
      tags: ['Textures'],
      requestBody: {
        content: {
          'image/png': {
            schema: {
              type: 'string',
              format: 'binary'
            }
          },
          'application/octet-stream': {
            schema: {
              type: 'string',
              format: 'binary'
            }
          }
        }
      },
      security: [{ Bearer: [] }]
    }
  })
  
  // DELETE /api/user/profile/{uuid}/skin
  .delete('/user/profile/:uuid/skin', removeSkinHandler, {
    detail: {
      summary: 'Remove skin',
      description: 'Remove skin from profile (revert to default Steve)',
      tags: ['Textures'],
      security: [{ Bearer: [] }]
    }
  })
  
  // GET /api/user/profile/{uuid}/skin
  .get('/user/profile/:uuid/skin', getSkinInfoHandler, {
    detail: {
      summary: 'Get skin info',
      description: 'Get information about profile skin',
      tags: ['Textures']
    }
  })
  
  // POST /api/user/profile/{uuid}/cape
  .post('/user/profile/:uuid/cape', uploadCapeHandler, {
    detail: {
      summary: 'Upload cape',
      description: 'Upload PNG cape file for a profile (64x32)',
      tags: ['Textures'],
      requestBody: {
        content: {
          'image/png': {
            schema: {
              type: 'string',
              format: 'binary'
            }
          },
          'application/octet-stream': {
            schema: {
              type: 'string',
              format: 'binary'
            }
          }
        }
      },
      security: [{ Bearer: [] }]
    }
  })
  
  // DELETE /api/user/profile/{uuid}/cape
  .delete('/user/profile/:uuid/cape', removeCapeHandler, {
    detail: {
      summary: 'Remove cape',
      description: 'Remove cape from profile',
      tags: ['Textures'],
      security: [{ Bearer: [] }]
    }
  })
  
  // GET /api/user/profile/{uuid}/cape
  .get('/user/profile/:uuid/cape', getCapeInfoHandler, {
    detail: {
      summary: 'Get cape info',
      description: 'Get information about profile cape',
      tags: ['Textures']
    }
  })

// Separate Elysia instance for texture serving (no /api prefix)
export const textureRoutes = new Elysia()
  // GET /textures/{hash}
  .get('/textures/:hash', serveTextureHandler, {
    detail: {
      summary: 'Serve texture file',
      description: 'Serve skin or cape file by SHA-256 hash',
      tags: ['Textures'],
      responses: {
        200: {
          description: 'PNG texture file',
          content: {
            'image/png': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            }
          }
        }
      }
    }
  })