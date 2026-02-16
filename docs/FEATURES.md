# Rate Limiting, CORS & Logging Guide

This guide explains the advanced features of the mailserver-hook application: rate limiting, CORS configuration, and request logging with SQLite.

## Table of Contents

1. [Rate Limiting](#rate-limiting)
2. [CORS Configuration](#cors-configuration)
3. [Request Logging](#request-logging)
4. [Analytics & Statistics](#analytics--statistics)
5. [Maintenance](#maintenance)

---

## Rate Limiting

Rate limiting protects your API from abuse by restricting the number of requests per IP address within a time window.

### Configuration

Rate limiting is **enabled by default**. Each endpoint has different limits:

- **General API endpoints**: 10 requests/minute per IP
- **Email send endpoint** (`/api/email/send`): 5 requests/minute per IP
- **Batch send endpoint** (`/api/email/batch`): 3 requests/minute per IP

To modify limits, edit `server/middleware/rate-limit.ts`:

```typescript
const RATE_LIMIT_CONFIG = {
  api: { maxRequests: 10, windowMs: 60 },
  emailSend: { maxRequests: 5, windowMs: 60 },
  emailBatch: { maxRequests: 3, windowMs: 60 },
}
```

### Enabling/Disabling

Set in `.env`:
```env
RATE_LIMIT_ENABLED=true    # Enable rate limiting
RATE_LIMIT_ENABLED=false   # Disable rate limiting
```

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 5           # Max requests in window
X-RateLimit-Remaining: 3       # Remaining requests
X-RateLimit-Reset: 1708080045  # Unix timestamp when limit resets
```

### Rate Limit Errors

When rate limit is exceeded, you'll receive a 429 response:

```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retryAfter": 45
}
```

**Recommended actions:**
1. Wait for `retryAfter` seconds before retrying
2. Implement exponential backoff in your client
3. Contact support if legitimate use exceeds limits

### Resetting Rate Limits

To reset rate limit for a specific IP address:

```bash
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reset-rate-limit",
    "clientIp": "192.168.1.100"
  }'
```

### How It Works

Rate limits are tracked in SQLite database with per-IP, per-window buckets:

- Window duration: Configurable (default 60 seconds)
- Storage: `request_logs` table in SQLite
- Reset: Automatic when window expires
- Distributed: Per client IP address from:
  - `X-Real-IP` header (Nginx)
  - `X-Forwarded-For` header (Cloud LBs)
  - Direct socket remote address (fallback)

---

## CORS Configuration

CORS (Cross-Origin Resource Sharing) allows requests from other domains. This is essential for web frontends.

### Enabling CORS

CORS is **enabled by default** with safe defaults. Configure allowed origins in `.env`:

```env
# Single origin
ALLOWED_ORIGINS=https://yourdomain.com

# Multiple origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://yourdomain.com

# Allow all origins (development only, NOT production!)
ALLOWED_ORIGINS=*
```

### CORS Headers in Responses

When a request from an allowed origin is made:

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
Access-Control-Expose-Headers: Content-Length, X-Total-Count
```

### Preflight Requests

Browsers automatically send `OPTIONS` requests to check CORS. The server responds with available methods and headers. This is handled automatically.

### Example: Frontend Request

**Frontend (http://localhost:5173):**
```javascript
const response = await fetch('http://localhost:3000/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-secret'
  },
  credentials: 'include',  // Send cookies if needed
  body: JSON.stringify({
    provider: 'gmail',
    message: {
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    }
  })
})

const data = await response.json()
console.log(data)
```

### Testing CORS

Check if CORS is working:

```bash
# Preflight request
curl -i -X OPTIONS http://localhost:3000/api/email/send \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# Actual request
curl -i http://localhost:3000/api/health \
  -H "Origin: http://localhost:5173"
```

### Security Best Practices

1. **Never use ALLOWED_ORIGINS=\* in production**
   - Explicitly list trusted domains
   - Use HTTPS for production domains

2. **Validate origins server-side**
   - The application validates origins
   - Only allows requests from listed origins

3. **Use credentials carefully**
   - Only enable when necessary
   - Verify origin matching with credentials

4. **Rotate origins periodically**
   - Update when adding new frontends
   - Remove old/deprecated origins

---

## Request Logging

Every request/response is automatically logged to SQLite for auditing and debugging.

### Logged Information

For each request, the system logs:

- **Timing**: Timestamp, duration in milliseconds
- **Request**: Method (GET/POST), path, request size
- **Response**: Status code, response size
- **Client**: IP address, user agent
- **Provider**: Gmail or SendGrid (for email endpoints)
- **Status**: Success/failure, error messages

**Example log entry:**
```
timestamp:     2024-02-16T10:30:45.123Z
method:        POST
path:          /api/email/send
statusCode:    200
requestSize:   256 bytes
responseSize:  512 bytes
duration:      245 ms
clientIp:      192.168.1.100
userAgent:     Mozilla/5.0...
provider:      gmail
success:       true
```

### Accessing Logs

**Get recent logs:**
```bash
curl "http://localhost:3000/api/logs?limit=50" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

**Filter by method and status:**
```bash
curl "http://localhost:3000/api/logs?method=POST&statusCode=200" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

**Filter by date range:**
```bash
curl "http://localhost:3000/api/logs?startDate=2024-02-01&endDate=2024-02-16" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

**Search by endpoint:**
```bash
curl "http://localhost:3000/api/logs?path=/email/send&limit=100" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

### Pagination

Logs are paginated to avoid loading too much data:

```bash
# Get logs 0-49
curl "http://localhost:3000/api/logs?limit=50&offset=0"

# Get logs 50-99
curl "http://localhost:3000/api/logs?limit=50&offset=50"

# Get logs 100-149
curl "http://localhost:3000/api/logs?limit=50&offset=100"
```

### Log Storage

- **Database**: SQLite (`.data/mailserver.db`)
- **Table**: `request_logs`
- **Indexes**: Optimized for timestamp, method, path, statusCode
- **Default retention**: 30 days (configurable)

### Privacy Considerations

Sensitive information is NOT logged:
- Full request/response bodies
- API keys or passwords
- Email content
- Database credentials

Only metadata is logged for security and privacy.

---

## Analytics & Statistics

Use the stats endpoints to understand API usage patterns.

### Overall Statistics

**Get statistics for a date range:**

```bash
curl "http://localhost:3000/api/stats?startDate=2024-02-01&endDate=2024-02-16" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 1250,
    "successfulRequests": 1180,
    "failedRequests": 70,
    "averageResponseTime": 245.5,
    "statusCodeBreakdown": {
      "200": 1180,
      "400": 40,
      "429": 30
    },
    "period": {
      "start": "2024-02-01",
      "end": "2024-02-16"
    }
  },
  "timestamp": "2024-02-16T10:30:46.123Z"
}
```

### API Key Usage

**Get all API key stats:**

```bash
curl "http://localhost:3000/api/api-key-stats" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

**Get specific API key stats:**

```bash
curl "http://localhost:3000/api/api-key-stats?apiKey=YOUR_API_SECRET" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "apiKey": "secret-key-hash",
    "requestCount": 450,
    "lastUsed": "2024-02-16T10:30:45.123Z",
    "successCount": 430,
    "failureCount": 20,
    "created_at": "2024-02-01T08:00:00.000Z",
    "updated_at": "2024-02-16T10:30:45.123Z"
  },
  "timestamp": "2024-02-16T10:30:46.123Z"
}
```

### Key Metrics to Monitor

- **Success rate**: (successfulRequests / totalRequests) * 100%
- **Average response time**: totalDuration / requestCount
- **Error rate**: (failedRequests / totalRequests) * 100%
- **Rate limit hits**: count of 429 responses
- **API key usage**: requests per API key

---

## Maintenance

Regularly maintain the database to ensure optimal performance.

### Cleaning Old Logs

Remove logs older than a specified number of days:

```bash
# Delete logs older than 30 days
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cleanup-logs",
    "daysOld": 30
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "action": "cleanup-logs",
    "deletedLogs": 450,
    "message": "Deleted 450 logs older than 30 days"
  },
  "timestamp": "2024-02-16T10:30:46.123Z"
}
```

### Recommended Maintenance Schedule

- **Daily**: Monitor stats via `/api/stats`
- **Weekly**: Review API key usage via `/api/api-key-stats`
- **Monthly**: Clean logs older than 30+ days
- **Quarterly**: Analyze trends and adjust rate limits if needed

### Database Monitoring

Monitor SQLite database size:

```bash
# Unix/Linux
ls -lh .data/mailserver.db

# Or check via the application
# The system will warn if database gets too large
```

**Optimize database periodically:**

```bash
sqlite3 .data/mailserver.db "VACUUM;"
```

### Performance Tips

1. **Use pagination**: Always use limit/offset for logs
2. **Filter by date**: Specify date range to reduce query size
3. **Archive old logs**: Export and delete logs older than 90 days
4. **Monitor disk space**: Log database can grow with traffic
5. **Index frequently searched fields**: Already configured for timestamp, method, path, statusCode

---

## Real-World Examples

### Example 1: Monitor Email Send Rate

```bash
# Get stats for today
TODAY=$(date +%Y-%m-%d)
curl "http://localhost:3000/api/logs?path=/email/send&startDate=${TODAY}" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

### Example 2: Find Failed Attempts

```bash
# Get all failed requests from past week
START_DATE=$(date -d "7 days ago" +%Y-%m-%d)
curl "http://localhost:3000/api/logs?statusCode=400&startDate=${START_DATE}" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

### Example 3: Check Rate Limit Hits

```bash
# Get 429 rate limit responses
curl "http://localhost:3000/api/logs?statusCode=429" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

### Example 4: Monitor Specific API Key

```bash
# Track usage of a specific API key
curl "http://localhost:3000/api/api-key-stats?apiKey=YOUR_KEY" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

---

## Troubleshooting

### Issues with Rate Limiting

**Problem**: "429 Too Many Requests" error
- **Solution**: Wait for the time specified in `X-RateLimit-Reset` header
- **Check limits**: Review `/api/logs?statusCode=429`
- **Reset**: Use admin API to reset specific IP

### Issues with CORS

**Problem**: "No 'Access-Control-Allow-Origin' header"
- **Solution**: Add your origin to `ALLOWED_ORIGINS` in `.env`
- **Test**: Use curl with `-H "Origin: your-domain"` header
- **Debug**: Browser console will show exact error

### Issues with Logging

**Problem**: Database is growing too large
- **Solution**: Run cleanup-logs action to remove old logs
- **Monitor**: Check `.data/` directory size
- **Archive**: Export logs before cleanup for archival

### Issues with Stats

**Problem**: Stats showing incorrect numbers
- **Solution**: Check date range in query parameters
- **Debug**: Query logs directly to verify data
- **Refresh**: Stats cache refreshes on each request

---

## API Reference Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/logs` | GET | ✅ | Retrieve request logs |
| `/api/stats` | GET | ✅ | Get API statistics |
| `/api/api-key-stats` | GET | ✅ | Get API key usage |
| `/api/admin/maintenance` | POST | ✅ | Perform maintenance tasks |

---

For more information, see the main [README.md](README.md) file.
