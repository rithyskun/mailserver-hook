import { defineEventHandler, getQuery } from 'h3'
import { getApiKeyStats, getDatabase } from '~/server/utils/database'

/**
 * GET /api/api-key-stats
 * Get API key usage statistics
 * 
 * Query parameters:
 * - apiKey: specific API key to get stats for (optional, shows first 20 if not provided)
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const apiKey = query.apiKey as string | undefined

  if (apiKey) {
    const stats = getApiKeyStats(apiKey)
    return {
      success: true,
      data: stats || { message: 'No stats found for this API key' },
      timestamp: new Date().toISOString(),
    }
  }

  // Get all API key stats
  const db = getDatabase()
  const allStats = db
    .prepare(
      `
    SELECT * FROM api_key_usage 
    ORDER BY lastUsed DESC 
    LIMIT 100
  `,
    )
    .all() as any[]

  return {
    success: true,
    data: allStats,
    total: allStats.length,
    timestamp: new Date().toISOString(),
  }
})
