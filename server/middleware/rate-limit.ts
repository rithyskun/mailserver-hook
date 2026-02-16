import { defineEventHandler, createError, getHeader, setHeader } from 'h3'
import { getDatabase } from '~/server/utils/database'

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
  api: { maxRequests: 10, windowMs: 60 },
  emailSend: { maxRequests: 5, windowMs: 60 },
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
    db.prepare(
      'INSERT INTO rate_limits (clientIp, requestCount, lastRequest, window) VALUES (?, ?, ?, ?)',
    ).run(clientIp, 1, now.toISOString(), windowKey)

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now.getTime() + config.windowMs * 1000,
    }
  }

  if (existing.requestCount >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: now.getTime() + config.windowMs * 1000,
    }
  }

  db.prepare(
    'UPDATE rate_limits SET requestCount = requestCount + 1, lastRequest = ? WHERE clientIp = ? AND window = ?',
  ).run(now.toISOString(), clientIp, windowKey)

  return {
    allowed: true,
    remaining: config.maxRequests - existing.requestCount - 1,
    resetTime: now.getTime() + config.windowMs * 1000,
  }
}

/**
 * Rate limiting middleware
 */
export default defineEventHandler((event) => {
  try {
    const path = event.node.req.url

    // Skip health check and non-API routes
    if (!path || path.includes('/health') || !path.includes('/api/')) {
      return
    }

    // Determine endpoint type
    let endpoint: 'api' | 'emailSend' | 'emailBatch' = 'api'
    if (path.includes('/api/email/send')) {
      endpoint = 'emailSend'
    } else if (path.includes('/api/email/batch')) {
      endpoint = 'emailBatch'
    }

    // Check rate limit
    const clientIp = getClientIp(event)
    const config = RATE_LIMIT_CONFIG[endpoint]
    const limit = checkRateLimit(clientIp, endpoint)

    // Set rate limit headers
    setHeader(event, 'x-ratelimit-limit', config.maxRequests.toString())
    setHeader(event, 'x-ratelimit-remaining', limit.remaining.toString())
    setHeader(event, 'x-ratelimit-reset', Math.ceil(limit.resetTime / 1000).toString())

    // Reject if rate limit exceeded
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
  } catch (error) {
    throw error
  }
})
