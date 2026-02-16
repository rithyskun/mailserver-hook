import { defineEventHandler, getHeader, createError } from 'h3'
import type { ApiErrorResponse } from '~/types/email'

/**
 * API Key authentication middleware
 * Validates the API key from the Authorization header
 */
export default defineEventHandler(async (event) => {
  // Skip middleware for health check endpoints
  if (event.node.req.url?.includes('/api/health')) {
    return
  }

  // Only apply to API routes
  if (!event.node.req.url?.startsWith('/api/')) {
    return
  }

  try {
    const config = useRuntimeConfig()
    const authHeader = getHeader(event, 'authorization')

    if (!authHeader) {
    const error: ApiErrorResponse = {
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing Authorization header',
    }
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: error,
    })
  }

    // Extract Bearer token
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token || token !== config.apiSecret) {
    const error: ApiErrorResponse = {
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid API key',
    }
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: error,
    })
  }

    // API key is valid, attach to event for use in handlers
    event.context.apiKey = token
  } catch (error) {
    throw error
  }
})
