import { defineEventHandler } from 'h3'

/**
 * GET /api/health
 * Health check endpoint to verify service is running
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      gmail: {
        configured: !!(config.gmail.clientEmail && config.gmail.privateKey),
      },
      sendgrid: {
        configured: !!config.sendgrid.apiKey,
      },
    },
  }
})
