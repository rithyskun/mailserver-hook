import { initializeDatabase } from '../utils/database'

export default defineNitroPlugin(() => {
  console.log('[Plugin] Initializing database...')
  try {
    initializeDatabase()
    console.log('[Plugin] Database initialized successfully')
  } catch (error) {
    console.error('[Plugin] Failed to initialize database:', error)
    throw error
  }
})
