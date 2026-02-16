import { defineEventHandler, setHeader, getHeader } from 'h3'

/**
 * CORS middleware
 * Handles Cross-Origin Resource Sharing
 */
export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')

  // List of allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || [],
  ]
    .flat()
    .filter(Boolean)

  // Check if origin is allowed
  const isOriginAllowed =
    !origin ||
    allowedOrigins.length === 0 ||
    allowedOrigins.some(
      (allowed) =>
        allowed === '*' ||
        allowed === origin ||
        (allowed.startsWith('*.') && origin?.endsWith(allowed.slice(2))),
    )

  if (isOriginAllowed) {
    // Set CORS headers
    setHeader(event, 'Access-Control-Allow-Origin', origin || '*')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    setHeader(
      event,
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    )
    setHeader(event, 'Access-Control-Allow-Credentials', 'true')
    setHeader(event, 'Access-Control-Max-Age', 3600)
    setHeader(event, 'Access-Control-Expose-Headers', 'Content-Length, X-Total-Count')

    // Handle preflight requests
    if (event.node.req.method === 'OPTIONS') {
      event.node.res.statusCode = 200
      return
    }
  }
})
