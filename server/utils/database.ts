import Database from 'better-sqlite3'
import path from 'path'

let dbInstance: Database.Database | null = null

export interface RequestLog {
  id?: number
  timestamp: string
  method: string
  path: string
  statusCode: number
  requestSize: number
  responseSize: number
  duration: number
  clientIp: string
  userAgent?: string
  provider?: string
  success: boolean
  errorMessage?: string
}

/**
 * Initialize SQLite database connection
 */
export function initializeDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance
  }

  // Create database in .data directory for persistence
  const dataDir = path.join(process.cwd(), '.data')
  const dbPath = path.join(dataDir, 'mailserver.db')

  dbInstance = new Database(dbPath)

  // Enable foreign keys
  dbInstance.pragma('journal_mode = WAL')
  dbInstance.pragma('foreign_keys = ON')

  // Create tables
  createTables(dbInstance)

  console.log(`[Database] Connected to SQLite at: ${dbPath}`)
  return dbInstance
}

/**
 * Create necessary database tables
 */
function createTables(db: Database.Database): void {
  // Request logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      statusCode INTEGER NOT NULL,
      requestSize INTEGER DEFAULT 0,
      responseSize INTEGER DEFAULT 0,
      duration REAL DEFAULT 0,
      clientIp TEXT,
      userAgent TEXT,
      provider TEXT,
      success INTEGER DEFAULT 0,
      errorMessage TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_timestamp (timestamp),
      INDEX idx_path (path),
      INDEX idx_statusCode (statusCode),
      INDEX idx_method (method)
    )
  `)

  // Rate limit tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientIp TEXT NOT NULL UNIQUE,
      requestCount INTEGER DEFAULT 1,
      lastRequest DATETIME DEFAULT CURRENT_TIMESTAMP,
      window TEXT NOT NULL,
      INDEX idx_clientIp (clientIp),
      INDEX idx_lastRequest (lastRequest)
    )
  `)

  // API key usage tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_key_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apiKey TEXT NOT NULL,
      requestCount INTEGER DEFAULT 1,
      lastUsed DATETIME DEFAULT CURRENT_TIMESTAMP,
      successCount INTEGER DEFAULT 0,
      failureCount INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_apiKey (apiKey),
      INDEX idx_lastUsed (lastUsed)
    )
  `)

  console.log('[Database] Tables created successfully')
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initializeDatabase()
  }
  return dbInstance
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    console.log('[Database] Connection closed')
  }
}

/**
 * Log an incoming request
 */
export function logRequest(log: RequestLog): number {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT INTO request_logs (
      timestamp,
      method,
      path,
      statusCode,
      requestSize,
      responseSize,
      duration,
      clientIp,
      userAgent,
      provider,
      success,
      errorMessage
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    log.timestamp,
    log.method,
    log.path,
    log.statusCode,
    log.requestSize,
    log.responseSize,
    log.duration,
    log.clientIp,
    log.userAgent,
    log.provider,
    log.success ? 1 : 0,
    log.errorMessage || null,
  )

  return result.lastInsertRowid as number
}

/**
 * Get request logs with optional filtering
 */
export function getRequestLogs(
  limit: number = 100,
  offset: number = 0,
  filter?: {
    method?: string
    path?: string
    statusCode?: number
    startDate?: string
    endDate?: string
  },
): RequestLog[] {
  const db = getDatabase()

  let query = 'SELECT * FROM request_logs WHERE 1=1'
  const params: any[] = []

  if (filter?.method) {
    query += ' AND method = ?'
    params.push(filter.method)
  }

  if (filter?.path) {
    query += ' AND path LIKE ?'
    params.push(`%${filter.path}%`)
  }

  if (filter?.statusCode) {
    query += ' AND statusCode = ?'
    params.push(filter.statusCode)
  }

  if (filter?.startDate) {
    query += ' AND timestamp >= ?'
    params.push(filter.startDate)
  }

  if (filter?.endDate) {
    query += ' AND timestamp <= ?'
    params.push(filter.endDate)
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const stmt = db.prepare(query)
  return stmt.all(...params) as RequestLog[]
}

/**
 * Get request statistics
 */
export function getRequestStats(
  startDate?: string,
  endDate?: string,
): {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  statusCodeBreakdown: Record<number, number>
} {
  const db = getDatabase()

  let query = 'SELECT * FROM request_logs WHERE 1=1'
  const params: any[] = []

  if (startDate) {
    query += ' AND timestamp >= ?'
    params.push(startDate)
  }

  if (endDate) {
    query += ' AND timestamp <= ?'
    params.push(endDate)
  }

  const logs = db.prepare(query).all(...params) as RequestLog[]

  const statusCodeBreakdown: Record<number, number> = {}
  let successCount = 0
  let failCount = 0
  let totalDuration = 0

  for (const log of logs) {
    statusCodeBreakdown[log.statusCode] = (statusCodeBreakdown[log.statusCode] || 0) + 1

    if (log.success) {
      successCount++
    } else {
      failCount++
    }

    totalDuration += log.duration
  }

  return {
    totalRequests: logs.length,
    successfulRequests: successCount,
    failedRequests: failCount,
    averageResponseTime: logs.length > 0 ? totalDuration / logs.length : 0,
    statusCodeBreakdown,
  }
}

/**
 * Track API key usage
 */
export function trackApiKeyUsage(
  apiKey: string,
  success: boolean,
): void {
  const db = getDatabase()

  const existing = db.prepare('SELECT * FROM api_key_usage WHERE apiKey = ?').get(apiKey)

  if (existing) {
    const stmt = db.prepare(`
      UPDATE api_key_usage 
      SET requestCount = requestCount + 1,
          lastUsed = CURRENT_TIMESTAMP,
          successCount = successCount + ?,
          failureCount = failureCount + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE apiKey = ?
    `)
    stmt.run(success ? 1 : 0, success ? 0 : 1, apiKey)
  } else {
    const stmt = db.prepare(`
      INSERT INTO api_key_usage (apiKey, successCount, failureCount)
      VALUES (?, ?, ?)
    `)
    stmt.run(apiKey, success ? 1 : 0, success ? 0 : 1)
  }
}

/**
 * Get API key usage stats
 */
export function getApiKeyStats(apiKey: string) {
  const db = getDatabase()

  return db
    .prepare('SELECT * FROM api_key_usage WHERE apiKey = ?')
    .get(apiKey)
}

/**
 * Clean up old logs (older than specified days)
 */
export function cleanupOldLogs(daysOld: number = 30): number {
  const db = getDatabase()

  const result = db.prepare(`
    DELETE FROM request_logs 
    WHERE datetime(created_at) < datetime('now', '-' || ? || ' days')
  `).run(daysOld)

  return result.changes
}

/**
 * Reset rate limit for an IP
 */
export function resetRateLimit(clientIp: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM rate_limits WHERE clientIp = ?').run(clientIp)
}
