# Quick Start Guide - Advanced Features

Get started with Rate Limiting, CORS, and Request Logging in 5 minutes!

## Installation

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Create environment
cp .env.example .env

# Update .env with your settings
nano .env  # or edit with your editor
```

## Minimal Configuration

```env
# Required
API_SECRET=your-super-secret-key-here

# At least one provider
GMAIL_CLIENT_EMAIL=...
GMAIL_PRIVATE_KEY=...
# OR
SENDGRID_API_KEY=...

# New features (optional - defaults are fine)
RATE_LIMIT_ENABLED=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Start Server

```bash
npm run dev
```

Server runs at: `http://localhost:3000`

---

## Testing Features Immediately

### 1. Check Health (CORS-enabled)
```bash
curl http://localhost:3000/api/health
```

### 2. Send an Email (will be logged)
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sendgrid",
    "message": {
      "to": "test@example.com",
      "subject": "Hello",
      "html": "<p>Test email</p>"
    }
  }'
```

### 3. View Request Logs
```bash
curl http://localhost:3000/api/logs \
  -H "Authorization: Bearer your-secret-key-here"
```

### 4. Get Statistics
```bash
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer your-secret-key-here"
```

### 5. Check API Key Usage
```bash
curl http://localhost:3000/api/api-key-stats \
  -H "Authorization: Bearer your-secret-key-here"
```

### 6. Test Rate Limiting
```bash
# Send 6 requests quickly (limit is 5 per minute)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/email/send \
    -H "Authorization: Bearer your-secret-key-here" \
    -H "Content-Type: application/json" \
    -d '{"provider":"gmail","message":{"to":"test@example.com","subject":"Test","html":"<p></p>"}}'
done
# The 6th request will return 429 (Too Many Requests)
```

### 7. Test CORS
```bash
# From a browser at http://localhost:5173
fetch('http://localhost:3000/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-secret-key-here'
  },
  body: JSON.stringify({
    provider: 'gmail',
    message: {
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    }
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

---

## Key Limits

**By default:**
- **General API**: 10 requests/minute per IP
- **Send Email**: 5 requests/minute per IP  
- **Batch Send**: 3 requests/minute per IP

When exceeded, you get:
```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "retryAfter": 45
}
```

---

## Key Endpoints

| Endpoint | What it does |
|----------|-------------|
| `GET /api/health` | Service status |
| `GET /api/logs` | View all logged requests |
| `GET /api/stats` | API statistics |
| `GET /api/api-key-stats` | API key usage |
| `POST /api/admin/maintenance` | Clean logs, reset rate limits |

---

## Common Tasks

### See what requests were made today
```bash
TODAY=$(date +%Y-%m-%d)
curl "http://localhost:3000/api/logs?startDate=${TODAY}" \
  -H "Authorization: Bearer YOUR_KEY" | jq
```

### See only failed requests
```bash
curl "http://localhost:3000/api/logs?statusCode=400" \
  -H "Authorization: Bearer YOUR_KEY" | jq
```

### See stats for this month
```bash
START=$(date -d "1 month ago" +%Y-%m-%d)
END=$(date +%Y-%m-%d)
curl "http://localhost:3000/api/stats?startDate=${START}&endDate=${END}" \
  -H "Authorization: Bearer YOUR_KEY" | jq
```

### Get one API key's stats
```bash
curl "http://localhost:3000/api/api-key-stats?apiKey=YOUR_KEY" \
  -H "Authorization: Bearer YOUR_KEY" | jq
```

### Clean up old logs
```bash
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup-logs","daysOld":30}'
```

### Reset rate limit for an IP
```bash
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"reset-rate-limit","clientIp":"192.168.1.100"}'
```

---

## Run Full Test Suite

```bash
chmod +x test-advanced-features.sh
pnpm test:advanced
# or manually:
./test-advanced-features.sh
```

This tests all features and shows you examples.

---

## Next Steps

1. **Read FEATURES.md** - Complete guide to all features
2. **Read ADVANCED-FEATURES.md** - Technical details
3. **Review README.md** - Full API documentation
4. **Check SETUP.md** - Gmail/SendGrid configuration

---

## Troubleshooting

### Getting 401 Unauthorized?
```bash
# Make sure API key is correct
curl -H "Authorization: Bearer YOUR_ACTUAL_API_KEY" http://localhost:3000/api/logs
```

### Getting 429 Too Many Requests?
```bash
# Wait for X-RateLimit-Reset timestamp or reset the IP
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"reset-rate-limit","clientIp":"127.0.0.1"}'
```

### CORS errors in browser?
```bash
# Check ALLOWED_ORIGINS in .env includes your domain
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

### Database errors?
```bash
# Check .data directory exists with proper permissions
mkdir -p .data
chmod 755 .data
```

---

## Docker Deployment

```bash
# Update .env with your settings
nano .env

# Build and run
docker-compose up --build

# Stop
docker-compose down

# View logs
docker-compose logs mailserver-hook -f
```

**Note:** Docker builds internally, so no need for pnpm in the container.

---

## Need Help?

- **Features documentation**: Read `FEATURES.md`
- **API examples**: See `README.md`
- **Implementation details**: Check `ADVANCED-FEATURES.md`
- **Run tests**: Execute `./test-advanced-features.sh`
- **View logs**: `curl http://localhost:3000/api/logs`

---

**You're all set!** 🚀

Start building with rate limiting, CORS, and comprehensive logging enabled.
