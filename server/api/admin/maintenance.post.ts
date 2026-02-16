import { defineEventHandler, readBody, createError } from 'h3'
import { cleanupOldLogs, resetRateLimit } from '~/server/utils/database'

interface AdminRequest {
  action: 'cleanup-logs' | 'reset-rate-limit'
  daysOld?: number
  clientIp?: string
}

/**
 * POST /api/admin/maintenance
 * Perform administrative maintenance tasks
 * 
 * Requires API_SECRET in Authorization header
 * 
 * Request body:
 * {
 *   "action": "cleanup-logs" | "reset-rate-limit",
 *   "daysOld": 30,  // for cleanup-logs
 *   "clientIp": "192.168.1.1"  // for reset-rate-limit
 * }
 */
export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody<AdminRequest>(event)

    if (!payload.action) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { message: 'action is required' },
      })
    }

    let result: any

    switch (payload.action) {
      case 'cleanup-logs':
        const daysOld = payload.daysOld || 30
        const deletedCount = cleanupOldLogs(daysOld)
        result = {
          action: 'cleanup-logs',
          deletedLogs: deletedCount,
          message: `Deleted ${deletedCount} logs older than ${daysOld} days`,
        }
        break

      case 'reset-rate-limit':
        if (!payload.clientIp) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            data: { message: 'clientIp is required for reset-rate-limit action' },
          })
        }
        resetRateLimit(payload.clientIp)
        result = {
          action: 'reset-rate-limit',
          clientIp: payload.clientIp,
          message: `Rate limit reset for IP: ${payload.clientIp}`,
        }
        break

      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          data: { message: 'Invalid action' },
        })
    }

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Admin maintenance error:', error)
    throw error
  }
})
