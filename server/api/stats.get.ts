import { defineEventHandler, getQuery } from 'h3'
import { getRequestStats } from '~/server/utils/database'

/**
 * GET /api/stats
 * Get request statistics from the database
 * 
 * Query parameters:
 * - startDate: ISO date to start statistics from
 * - endDate: ISO date to end statistics at
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined

  const stats = getRequestStats(startDate, endDate)

  return {
    success: true,
    data: {
      ...stats,
      period: {
        start: startDate,
        end: endDate,
      },
    },
    timestamp: new Date().toISOString(),
  }
})
