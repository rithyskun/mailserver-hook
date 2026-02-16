# Email Web Server Hook

A Nuxt.js TypeScript application for sending emails via Gmail or SendGrid with secure API key authentication.

## Features

- ✅ **Nuxt 3** with TypeScript support
- ✅ **Gmail Integration** - Send emails via Google Suite (Service Account)
- ✅ **SendGrid Integration** - Send emails via SendGrid API
- ✅ **API Key Authentication** - Bearer token validation on all endpoints
- ✅ **Batch Email Support** - Send multiple emails in one request
- ✅ **Health Check Endpoint** - Monitor service status
- ✅ **Error Handling** - Comprehensive error responses
- ✅ **Environment Configuration** - Secure credential management
- ✅ **Rate Limiting** - Per-endpoint request throttling with SQLite tracking
- ✅ **CORS Support** - Configurable cross-origin resource sharing
- ✅ **Request Logging** - SQLite-based logging of all incoming/outgoing traffic
- ✅ **Analytics & Stats** - Real-time API statistics and usage tracking

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (or npm/yarn, but pnpm recommended)
- Gmail Service Account (for Gmail support)
- SendGrid API Key (for SendGrid support)

## Installation

1. **Clone the repository**
   ```bash
   cd /workspaces/mailserver-hook
   ```

2. **Install pnpm** (if not already installed)
   ```bash
   npm install -g pnpm
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your credentials:
   ```env
   # API Security - Set a strong secret key
   API_SECRET=your-super-secure-api-key-here

   # Gmail Configuration (Service Account)
   GMAIL_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GMAIL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

   # SendGrid Configuration
   SENDGRID_API_KEY=SG.xxxxxxxxxxxx

   # Email Configuration
   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
   DEFAULT_FROM_NAME=Your Application
   ```

## Setup for Gmail

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project

2. **Enable Gmail API**
   - Enable the Gmail API in your project
   - Create a Service Account
   - Download the service account JSON key

3. **Grant Sending Permissions**
   - Configure the service account email in your workspace

4. **Update Environment Variables**
   ```env
   GMAIL_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GMAIL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```

## Setup for SendGrid

1. **Create SendGrid Account**
   - Sign up at [SendGrid](https://sendgrid.com)

2. **Generate API Key**
   - Go to Settings → API Keys
   - Create a new API key with Mail Send permission

3. **Update Environment Variables**
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxx
   ```

## Running the Application

### Development
```bash
pnpm dev
```
Server runs at `http://localhost:3000`

### Build for Production
```bash
pnpm build
```

### Preview Production Build
```bash
pnpm preview
```

### Run Tests
```bash
pnpm test:advanced
pnpm test:api
```

## API Endpoints

### Health Check
**GET** `/api/health`

No authentication required. Check service and providers status.

```bash
curl http://localhost:3000/api/health
```

### Send Email
**POST** `/api/email/send`

Send a single email via Gmail or SendGrid.

**Headers:**
```
Authorization: Bearer your-api-secret-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider": "gmail",
  "message": {
    "to": "recipient@example.com",
    "cc": "cc@example.com",
    "bcc": "bcc@example.com",
    "subject": "Hello World",
    "html": "<h1>Welcome</h1><p>This is an HTML email</p>",
    "text": "Welcome! This is a text email",
    "from": "sender@domain.com",
    "replyTo": "reply@domain.com"
  }
}
```

**Example with cURL:**
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer your-api-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "message": {
      "to": "user@example.com",
      "subject": "Test Email",
      "html": "<p>This is a test</p>"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "provider": "gmail",
  "messageId": "CADc-_xaBc123...",
  "timestamp": "2024-02-16T10:30:45.123Z"
}
```

### Batch Send Emails
**POST** `/api/email/batch`

Send multiple emails in one request.

**Headers:**
```
Authorization: Bearer your-api-secret-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider": "sendgrid",
  "messages": [
    {
      "to": "user1@example.com",
      "subject": "Email 1",
      "html": "<p>First email</p>"
    },
    {
      "to": "user2@example.com",
      "subject": "Email 2",
      "html": "<p>Second email</p>"
    }
  ]
}
```

**Response:**
```json
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "success": true,
      "provider": "sendgrid",
      "messageId": "123456789",
      "timestamp": "2024-02-16T10:30:45.123Z"
    },
    {
      "success": true,
      "provider": "sendgrid",
      "messageId": "987654321",
      "timestamp": "2024-02-16T10:30:46.123Z"
    }
  ],
  "timestamp": "2024-02-16T10:30:46.123Z"
}
```

## Advanced Features

### Request Logging & Analytics

All incoming and outgoing requests are automatically logged to SQLite database for monitoring and analytics.

**Retrieve Request Logs**
**GET** `/api/logs`

Query Parameters:
- `limit` - Number of logs (default: 100, max: 500)
- `offset` - Pagination offset (default: 0)
- `method` - Filter by HTTP method (GET, POST, etc.)
- `path` - Filter by endpoint path (partial match)
- `statusCode` - Filter by response status code
- `startDate` - Filter logs after ISO date
- `endDate` - Filter logs before ISO date

```bash
curl "http://localhost:3000/api/logs?limit=50&method=POST&path=/email/send" \
  -H "Authorization: Bearer your-api-secret-key"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "timestamp": "2024-02-16T10:30:45.123Z",
      "method": "POST",
      "path": "/api/email/send",
      "statusCode": 200,
      "requestSize": 256,
      "responseSize": 512,
      "duration": 245,
      "clientIp": "192.168.1.100",
      "userAgent": "curl/7.64.1",
      "provider": "gmail",
      "success": true
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1250,
    "hasMore": true
  },
  "timestamp": "2024-02-16T10:30:46.123Z"
}
```

### API Statistics

**GET** `/api/stats`

Get overall API statistics. Optional query parameters:
- `startDate` - Start date (ISO format)
- `endDate` - End date (ISO format)

```bash
curl "http://localhost:3000/api/stats?startDate=2024-02-01&endDate=2024-02-16" \
  -H "Authorization: Bearer your-api-secret-key"
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

### API Key Usage Statistics

**GET** `/api/api-key-stats`

Get usage statistics for API keys. Query parameters:
- `apiKey` - (Optional) Get stats for specific API key. If not provided, shows top 100 API keys.

```bash
curl "http://localhost:3000/api/api-key-stats" \
  -H "Authorization: Bearer your-api-secret-key"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "apiKey": "secret-key-hash",
      "requestCount": 450,
      "lastUsed": "2024-02-16T10:30:45.123Z",
      "successCount": 430,
      "failureCount": 20,
      "created_at": "2024-02-01T08:00:00.000Z",
      "updated_at": "2024-02-16T10:30:45.123Z"
    }
  ],
  "total": 5,
  "timestamp": "2024-02-16T10:30:46.123Z"
}
```

### Rate Limiting

Rate limiting is automatically applied to all endpoints to prevent abuse:

- **General API endpoints**: 10 requests per minute per IP
- **Email send endpoint** (`/api/email/send`): 5 requests per minute per IP
- **Batch send endpoint** (`/api/email/batch`): 3 requests per minute per IP

Rate limit headers are included in all responses:
- `X-RateLimit-Limit` - Maximum requests in current window
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Unix timestamp when limit resets

**Rate Limit Error Response (429):**
```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retryAfter": 30
}
```

### Cross-Origin Resource Sharing (CORS)

CORS is enabled and configured via environment variables.

**Configuration:**
```env
# Allowed origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://yourdomain.com

# Enable/disable rate limiting
RATE_LIMIT_ENABLED=true
```

**Example CORS Request:**
```javascript
// From frontend (http://localhost:5173)
fetch('http://localhost:3000/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-secret-key'
  },
  body: JSON.stringify({
    provider: 'gmail',
    message: {
      to: 'recipient@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>'
    }
  })
})
  .then(res => res.json())
  .then(data => console.log(data))
```

### Maintenance Operations

**POST** `/api/admin/maintenance`

Perform administrative maintenance tasks. Requires API authentication.

**Clean Old Logs:**
```bash
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Authorization: Bearer your-api-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cleanup-logs",
    "daysOld": 30
  }'
```

**Reset Client Rate Limit:**
```bash
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Authorization: Bearer your-api-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reset-rate-limit",
    "clientIp": "192.168.1.100"
  }'
```

## Project Structure

```
mailserver-hook/
├── server/
│   ├── api/
│   │   ├── health.get.ts          # Health check endpoint
│   │   ├── logs.get.ts            # Request logs endpoint
│   │   ├── stats.get.ts           # Statistics endpoint
│   │   ├── api-key-stats.get.ts   # API key usage stats
│   │   ├── email/
│   │   │   ├── send.post.ts       # Single email endpoint
│   │   │   └── batch.post.ts      # Batch email endpoint
│   │   └── admin/
│   │       └── maintenance.post.ts # Admin maintenance tasks
│   ├── middleware/
│   │   ├── auth.ts                # API key authentication
│   │   ├── rate-limit.ts          # Rate limiting middleware
│   │   ├── logging.ts             # Request/response logging
│   │   └── cors.ts                # CORS configuration
│   └── utils/
│       ├── database.ts            # SQLite database service
│       ├── gmail.service.ts       # Gmail email service
│       └── sendgrid.service.ts    # SendGrid email service
├── types/
│   └── email.ts                   # TypeScript type definitions
├── .data/
│   └── mailserver.db              # SQLite database file
├── nuxt.config.ts                 # Nuxt configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Project dependencies
├── .env.example                   # Environment variables template
└── README.md                       # This file
```


## Security Considerations

1. **API Key Storage**
   - Never commit `.env` file to version control
   - Use environment variables in production
   - Rotate API keys regularly
   - Use strong, random API secrets (min 32 characters)

2. **HTTPS & Network Security**
   - Use HTTPS in production (not HTTP)
   - Enable CORS only for trusted origins
   - Rate limiting is enabled by default
   - Implement additional firewall rules in production

3. **CORS Configuration**
   - Never use `ALLOWED_ORIGINS=*` in production
   - Explicitly whitelist trusted domains
   - Credentials are enabled only for allowed origins
   - CORS preflight requests are handled automatically

4. **Rate Limiting**
   - Rate limits are per-IP address and stored in SQLite
   - Limits can be reset via admin API
   - Configure limits in `server/middleware/rate-limit.ts` if needed
   - Returns `429 Too Many Requests` when limits exceeded

5. **Database Security**
   - SQLite database stored in `.data/` directory
   - Has WAL mode enabled for better concurrency
   - Foreign keys enforced
   - Regular cleanup of old logs recommended (30 days default)

6. **Credentials**
   - Keep service account keys secure
   - Use separate credentials for development/production
   - Encrypt sensitive environment variables in transit
   - Never log sensitive information

7. **Validation & Input Sanitization**
   - All inputs are validated before processing
   - API key required for all email endpoints
   - Email addresses and content are validated
   - SQL injection prevented with parameterized queries

## Error Handling

The API returns standardized error responses:

```json
{
  "statusCode": 400,
  "statusMessage": "Bad Request",
  "message": "Description of the error"
}
```

Common errors:
- `401 Unauthorized` - Missing or invalid API key
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Service configuration issues

## Testing

### Using Postman
1. Set base URL: `http://localhost:3000`
2. Add header: `Authorization: Bearer your-api-secret-key`
3. Create POST request to `/api/email/send`

### Using httpie
```bash
http --json POST http://localhost:3000/api/email/send \
  Authorization:"Bearer your-api-key" \
  provider=gmail \
  message:='{"to":"user@example.com","subject":"Test","html":"<p>Test</p>"}'
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `API_SECRET` | API key for authentication | ✅ Yes | - |
| `GMAIL_CLIENT_EMAIL` | Gmail service account email | ❌ No* | - |
| `GMAIL_PRIVATE_KEY` | Gmail service account private key | ❌ No* | - |
| `SENDGRID_API_KEY` | SendGrid API key | ❌ No* | - |
| `DEFAULT_FROM_EMAIL` | Default sender email | ✅ Yes | - |
| `DEFAULT_FROM_NAME` | Default sender name | ✅ Yes | - |
| `RATE_LIMIT_ENABLED` | Enable/disable rate limiting | ❌ No | `true` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | ❌ No | `http://localhost:3000,http://localhost:5173` |

*At least one email provider must be configured

## Troubleshooting

### Gmail Issues
- Ensure service account has Send permission
- Check private key format (should include newlines)
- Verify Gmail API is enabled in Google Cloud Console

### SendGrid Issues
- Verify API key is valid
- Check SendGrid account has enough credits
- Ensure sender domain is verified

### Rate Limiting Issues
- **429 Too Many Requests**: You've exceeded the rate limit. Wait for the `X-RateLimit-Reset` time
  - Email send: 5 requests/minute per IP
  - Batch send: 3 requests/minute per IP
  - Other endpoints: 10 requests/minute per IP
- Reset a specific IP's rate limit via admin API:
  ```bash
  curl -X POST http://localhost:3000/api/admin/maintenance \
    -H "Authorization: Bearer your-api-secret" \
    -H "Content-Type: application/json" \
    -d '{"action": "reset-rate-limit", "clientIp": "192.168.1.100"}'
  ```

### CORS Issues
- **Access-Control-Allow-Origin error**: Your origin is not in the allowed list
  - Update `ALLOWED_ORIGINS` environment variable
  - Comma-separated list of full URLs (e.g., `http://localhost:3000,https://yourdomain.com`)
  - Never use `*` in production
- Verify CORS headers in response:
  ```bash
  curl -i -H "Origin: http://localhost:5173" http://localhost:3000/api/health
  ```

### Database/Logging Issues
- **SQLite database locked**: Close other connections or restart the server
- **Database file not found**: Check `.data/` directory exists with proper permissions
- **Disk space**: SQLite database can grow with request logs. Clean old logs:
  ```bash
  curl -X POST http://localhost:3000/api/admin/maintenance \
    -H "Authorization: Bearer your-api-secret" \
    -H "Content-Type: application/json" \
    -d '{"action": "cleanup-logs", "daysOld": 30}'
  ```

### General Issues
- Check `.env` file is loaded: `npm run dev`
- Review server logs for detailed error messages
- Verify API key in Authorization header
- Use `/api/logs` endpoint to view request history
- Use `/api/stats` endpoint to check API metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue in the repository.
