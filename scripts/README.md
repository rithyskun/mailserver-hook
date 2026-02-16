# Test Scripts

This directory contains test scripts for the Email Web Server Hook API.

## Available Scripts

### 1. `test-all.sh` - Comprehensive Test Suite

A complete test suite that tests all API endpoints with proper error handling and reporting.

**Features:**
- Tests all endpoints systematically
- Validates both success and error scenarios
- Color-coded output for easy reading
- Test summary with pass/fail counts
- Proper exit codes for CI/CD integration

**Usage:**
```bash
# Using default configuration
./scripts/test-all.sh

# With custom API URL and key
API_URL=http://localhost:3001 API_KEY=your-api-key ./scripts/test-all.sh
```

**Environment Variables:**
- `API_URL` - Base URL of the API (default: `http://localhost:3000`)
- `API_KEY` - API secret key for authentication (default: `your-secret-key-here`)

### 2. `test-api.sh` - Basic API Tests

Simple test script demonstrating basic API usage.

**Usage:**
```bash
pnpm test:api
# or
./scripts/test-api.sh
```

**What it tests:**
- Health check endpoint
- Single email sending (Gmail & SendGrid)
- Batch email sending
- Authentication errors

### 3. `test-advanced-features.sh` - Advanced Features

Tests advanced features like rate limiting, CORS, logging, and analytics.

**Usage:**
```bash
pnpm test:advanced
# or
./scripts/test-advanced-features.sh
```

**What it tests:**
- CORS preflight requests
- Request logging and retrieval
- API statistics
- Rate limiting behavior
- Admin maintenance endpoints

## Setup

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and set your credentials:
```env
API_SECRET=your-secret-api-key-here
GMAIL_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GMAIL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SENDGRID_API_KEY=SG.your-sendgrid-api-key
```

### 2. Start the Development Server

```bash
pnpm dev
```

The server will start on `http://localhost:3000` (or `http://localhost:3001` if 3000 is occupied).

### 3. Run Tests

```bash
# Run comprehensive test suite
API_KEY=your-secret-api-key-here ./scripts/test-all.sh

# Or use npm scripts
pnpm test:api
pnpm test:advanced
```

## Test Coverage

### Public Endpoints
- ✓ `GET /api/health` - Health check

### Email Endpoints (Authenticated)
- ✓ `POST /api/email/send` - Send single email
  - Gmail provider
  - SendGrid provider
  - Validation errors
- ✓ `POST /api/email/batch` - Send batch emails
  - Multiple recipients
  - Validation errors

### Analytics Endpoints (Authenticated)
- ✓ `GET /api/logs` - Request logs with filtering
- ✓ `GET /api/stats` - API statistics
- ✓ `GET /api/api-key-stats` - API key usage stats

### Admin Endpoints (Authenticated)
- ✓ `POST /api/admin/maintenance` - Maintenance operations
  - Cleanup old logs
  - Reset rate limits

### Security & Error Handling
- ✓ Missing authentication
- ✓ Invalid API key
- ✓ Invalid request payloads
- ✓ Rate limiting

## CI/CD Integration

The `test-all.sh` script returns proper exit codes:
- `0` - All tests passed
- `1` - Some tests failed

Example GitHub Actions workflow:

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
      
      - name: Start server
        run: pnpm dev &
        env:
          API_SECRET: ${{ secrets.API_SECRET }}
      
      - name: Wait for server
        run: sleep 5
      
      - name: Run tests
        run: ./scripts/test-all.sh
        env:
          API_KEY: ${{ secrets.API_SECRET }}
```

## Troubleshooting

### Tests fail with "Connection refused"
- Ensure the dev server is running: `pnpm dev`
- Check the server is on the correct port (default: 3000)

### Authentication errors
- Verify `API_KEY` matches your `API_SECRET` in `.env`
- Check the Authorization header format: `Bearer your-api-key`

### Email sending fails
- Verify Gmail/SendGrid credentials in `.env`
- Check service account permissions (Gmail)
- Verify SendGrid API key is valid

### Rate limit errors
- Wait 60 seconds between test runs
- Use admin endpoint to reset rate limits:
  ```bash
  curl -X POST http://localhost:3000/api/admin/maintenance \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"action":"reset-rate-limit","clientIp":"127.0.0.1"}'
  ```

## Manual Testing with curl

### Send Email
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "message": {
      "to": "recipient@example.com",
      "subject": "Test Email",
      "html": "<h1>Hello</h1><p>Test email</p>",
      "text": "Hello! Test email"
    }
  }'
```

### Get Logs
```bash
curl http://localhost:3000/api/logs?limit=10 \
  -H "Authorization: Bearer your-api-key"
```

### Get Statistics
```bash
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer your-api-key"
```

## Contributing

When adding new endpoints:
1. Add test cases to `test-all.sh`
2. Update this README with the new endpoint
3. Ensure tests cover both success and error scenarios
