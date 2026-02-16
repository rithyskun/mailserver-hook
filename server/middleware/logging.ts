import { defineEventHandler, getHeader, getMethod } from 'h3'
import { logRequest, trackApiKeyUsage } from '~/server/utils/database'

interface RequestContext {
  startTime: number
  requestSize: number
  responseSize: number
}

/**
 * Get client IP address from request
 */
function getClientIp(event: any): string {
  return (
    getHeader(event, 'cf-connecting-ip') ||
    getHeader(event, 'x-forwarded-for')?.split(',')[0] ||
    getHeader(event, 'x-real-ip') ||
    event.node.req.socket.remoteAddress ||
    'unknown'
  ).trim()
}

/**
 * Extract provider from request body
 */
async function extractProvider(event: any): Promise<string | undefined> {
  try {
    if (event.node.req.method !== 'POST' || !event.node.req.readable) {
      return undefined
    }

    const body = await readBody(event)
    return body?.provider || undefined
  } catch {
    return undefined
  }
}

/**
 * Logging middleware
 * Logs all incoming requests and outgoing responses to SQLite
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const method = getMethod(event)
  const path = event.node.req.url || '/'
  const clientIp = getClientIp(event)
  const userAgent = getHeader(event, 'user-agent')
  const authHeader = getHeader(event, 'authorization')

  // Skip health checks and static assets
  if (path.includes('/health') || path.includes('/_') || path.match(/\.(js|css|map)$/)) {
    return
  }

  // Calculate request size
  const contentLength = getHeader(event, 'content-length')
  const requestSize = contentLength ? parseInt(contentLength, 10) : 0

  // Extract provider if available
  let provider: string | undefined
  if (method === 'POST' && path.includes('/api/email/')) {
    try {
      provider = await extractProvider(event)
    } catch {
      // Ignore extraction errors
    }
  }

  // Store context on event for later use
  const context: RequestContext = {
    startTime,
    requestSize,
    responseSize: 0,
  }
  ;(event as any)._logging = context

  // Hook into response to track size and status
  const originalSend = event.node.res.send
  let statusCode = 200
  let success = true
  let errorMessage: string | undefined

  if (event.node.res) {
    event.node.res.send = function (data: any) {
      if (data) {
        context.responseSize = typeof data === 'string' ? Buffer.byteLength(data) : Buffer.byteLength(JSON.stringify(data))
      }
      return originalSend.apply(this, arguments)
    }

    // Track response status
    event.node.res.on('finish', () => {
      statusCode = event.node.res.statusCode || 200
    })
  }

  // Wrap response handler to capture errors
  let responseBody: any

  // Use onBeforeResponse hook
  const originalSendError = event.node.res.statusCode

  return async () => {
    try {
      // Calculate timing
      const duration = Date.now() - startTime
      statusCode = event.node.res.statusCode || 200
      success = statusCode >= 200 && statusCode < 400

      // Extract API key for usage tracking
      if (authHeader && authHeader.includes('Bearer ')) {
        const apiKey = authHeader.replace('Bearer ', '').trim()
        trackApiKeyUsage(apiKey, success)
      }

      // Log the request
      logRequest({
        timestamp: new Date().toISOString(),
        method,
        path,
        statusCode,
        requestSize: context.requestSize,
        responseSize: context.responseSize,
        duration,
        clientIp,
        userAgent,
        provider,
        success,
        errorMessage,
      })

      // Log to console in development
      if (process.env.NODE_ENV !== 'production') {
        const statusColor =
          statusCode >= 500
            ? '\x1b[31m' // Red
            : statusCode >= 400
              ? '\x1b[33m' // Yellow
              : statusCode >= 300
                ? '\x1b[36m' // Cyan
                : '\x1b[32m' // Green
        const reset = '\x1b[0m'

        const log =
          `[${new Date().toISOString()}] ${statusColor}${statusCode} ${reset}` +
          `${method} ${path} (${duration}ms) [${clientIp}]`

        if (provider) {
          console.log(log + ` - Provider: ${provider}`)
        } else {
          console.log(log)
        }
      }
    } catch (error) {
      console.error('[Logging] Error logging request:', error)
    }
  }
})
