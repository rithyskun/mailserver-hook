import { defineEventHandler, getQuery } from 'h3'
import { getRequestLogs, getRequestStats } from '~/server/utils/database'

/**
 * GET /api/logs
 * Retrieve request logs from the database
 * 
 * Query parameters:
 * - limit: number of logs to return (default: 100)
 * - offset: pagination offset (default: 0)
 * - method: filter by HTTP method (GET, POST, etc.)
 * - path: filter by path (partial match)
 * - statusCode: filter by status code
 * - startDate: filter logs after this ISO date
 * - endDate: filter logs before this ISO date
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const limit = Math.min(parseInt((query.limit as string) || '100'), 500)
  const offset = parseInt((query.offset as string) || '0')

  const filter = {
    method: query.method as string | undefined,
    path: query.path as string | undefined,
    statusCode: query.statusCode ? parseInt(query.statusCode as string) : undefined,
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
  }

  const logs = getRequestLogs(limit, offset, filter)

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as count FROM request_logs WHERE 1=1'
  const countParams: any[] = []

  if (filter.method) {
    countQuery += ' AND method = ?'
    countParams.push(filter.method)
  }
  if (filter.path) {
    countQuery += ' AND path LIKE ?'
    countParams.push(`%${filter.path}%`)
  }
  if (filter.statusCode) {
    countQuery += ' AND statusCode = ?'
    countParams.push(filter.statusCode)
  }
  if (filter.startDate) {
    countQuery += ' AND timestamp >= ?'
    countParams.push(filter.startDate)
  }
  if (filter.endDate) {
    countQuery += ' AND timestamp <= ?'
    countParams.push(filter.endDate)
  }

  const { getDatabase } = await import('~/server/utils/database')
  const db = getDatabase()
  const countResult = db.prepare(countQuery).get(...countParams) as { count: number }

  return {
    success: true,
    data: logs,
    pagination: {
      limit,
      offset,
      total: countResult.count,
      hasMore: offset + limit < countResult.count,
    },
    timestamp: new Date().toISOString(),
  }
})
