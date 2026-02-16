import { defineEventHandler, createError, getHeader } from 'h3'
import { getDatabase } from '~/server/utils/database'

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
  // General API endpoint: 10 requests per minute
  api: { maxRequests: 10, windowMs: 60 },
  // Email send endpoints: 5 requests per minute per IP
  emailSend: { maxRequests: 5, windowMs: 60 },
  // Batch endpoint: 3 requests per minute
  emailBatch: { maxRequests: 3, windowMs: 60 },
}

interface RateLimitEntry {
  id?: number
  clientIp: string
  requestCount: number
  lastRequest: string
  window: string
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
 * Check and update rate limit for a client
 */
function checkRateLimit(
  clientIp: string,
  endpoint: 'api' | 'emailSend' | 'emailBatch',
): { allowed: boolean; remaining: number; resetTime: number } {
  const db = getDatabase()
  const config = RATE_LIMIT_CONFIG[endpoint]
  const now = new Date()
  const windowKey = `${clientIp}:${Math.floor(now.getTime() / (config.windowMs * 1000))}`

  const existing = db
    .prepare('SELECT * FROM rate_limits WHERE clientIp = ? AND window = ?')
    .get(clientIp, windowKey) as RateLimitEntry | undefined

  if (!existing) {
    // First request in this window
    db.prepare('INSERT INTO rate_limits (clientIp, requestCount, window) VALUES (?, ?, ?)')
      .run(clientIp, 1, windowKey)

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now.getTime() + config.windowMs * 1000,
    }
  }

  if (existing.requestCount < config.maxRequests) {
    // Still within limit
    db.prepare('UPDATE rate_limits SET requestCount = requestCount + 1 WHERE id = ?')
      .run(existing.id)

    return {
      allowed: true,
      remaining: config.maxRequests - existing.requestCount - 1,
      resetTime: now.getTime() + config.windowMs * 1000,
    }
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetTime: now.getTime() + config.windowMs * 1000,
  }
}

/**
 * Generic rate limiter middleware
 */
export function createRateLimitMiddleware(endpoint: 'api' | 'emailSend' | 'emailBatch') {
  return defineEventHandler((event) => {
    const clientIp = getClientIp(event)
    const config = RATE_LIMIT_CONFIG[endpoint]
    const limit = checkRateLimit(clientIp, endpoint)

    // Set rate limit headers
    setHeader(event, 'x-ratelimit-limit', String(config.maxRequests))
    setHeader(event, 'x-ratelimit-remaining', String(limit.remaining))
    setHeader(event, 'x-ratelimit-reset', String(Math.ceil(limit.resetTime / 1000)))

    if (!limit.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        data: {
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000),
        },
      })
    }
  })
}

export default defineEventHandler((event) => {
  const path = event.node.req.url

  // Skip health check and non-API routes
  if (!path || path.includes('/health')) {
    return
  }

  // Apply rate limiting based on endpoint
  if (path.includes('/api/email/send')) {
    const limiter = createRateLimitMiddleware('emailSend')
    return limiter(event)
  } else if (path.includes('/api/email/batch')) {
    const limiter = createRateLimitMiddleware('emailBatch')
    return limiter(event)
  } else if (path.includes('/api/')) {
    const limiter = createRateLimitMiddleware('api')
    return limiter(event)
  }
})
