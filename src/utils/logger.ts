import pino from 'pino'
import { join } from 'path'

const isDevelopment = Bun.env.NODE_ENV === 'development'
const logLevel = Bun.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')

// Create logs directory if it doesn't exist
const logsDir = join(process.cwd(), 'logs')
try {
  await Bun.write(join(logsDir, '.gitkeep'), '')
} catch {
  // Directory might already exist
}

// Development logger (pretty printed to console)
const developmentLogger = pino({
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
})

// Production logger (JSON to file + console)
const productionLogger = pino({
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    targets: [
      // Console output (structured JSON)
      {
        target: 'pino/file',
        options: {
          destination: 1 // stdout
        }
      },
      // File output for all logs
      {
        target: 'pino/file',
        options: {
          destination: join(logsDir, 'app.log'),
          mkdir: true
        }
      },
      // Error file for errors only
      {
        target: 'pino/file',
        level: 'error',
        options: {
          destination: join(logsDir, 'error.log'),
          mkdir: true
        }
      }
    ]
  }
})

// Export the appropriate logger
export const logger = isDevelopment ? developmentLogger : productionLogger

// Specialized loggers for different components
export const authLogger = logger.child({ component: 'auth' })
export const sessionLogger = logger.child({ component: 'session' })
export const dbLogger = logger.child({ component: 'database' })
export const apiLogger = logger.child({ component: 'api' })

// Helper functions for common log patterns
export const logRequest = (method: string, path: string, ip?: string) => {
  apiLogger.info({
    request: {
      method,
      path,
      ip,
      timestamp: new Date().toISOString()
    }
  }, `${method} ${path}`)
}

export const logError = (error: any, context?: string) => {
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context
    }
  }, `Error: ${error.message}`)
}

export const logAuth = (action: string, userId?: string, profileId?: string) => {
  authLogger.info({
    auth: {
      action,
      userId,
      profileId,
      timestamp: new Date().toISOString()
    }
  }, `Auth: ${action}`)
}

export const logSession = (action: string, data: Record<string, any>) => {
  sessionLogger.info({
    session: {
      action,
      ...data,
      timestamp: new Date().toISOString()
    }
  }, `Session: ${action}`)
}