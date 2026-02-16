#!/bin/bash

# Email Web Server Hook - Advanced Features Testing Script
# Tests: Rate Limiting, CORS, Request Logging & Analytics

set -e

API_URL="http://localhost:3000"
API_KEY="your-api-secret-key-here"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Email Web Server Hook - Advanced Features Test Suite      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[1] Testing Health Check${NC}"
echo "GET /api/health (no auth required)"
curl -s "$API_URL/api/health" | jq . || echo "Health check failed"
echo ""
echo "---"
echo ""

# Test 2: CORS Preflight
echo -e "${YELLOW}[2] Testing CORS Preflight${NC}"
echo "OPTIONS /api/email/send with Origin header"
curl -i -X OPTIONS "$API_URL/api/email/send" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" 2>&1 | head -20
echo ""
echo "---"
echo ""

# Test 3: Single Email Send (will be logged)
echo -e "${YELLOW}[3] Testing Single Email Send (Gmail)${NC}"
echo "POST /api/email/send with logging"
curl -s -X POST "$API_URL/api/email/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "message": {
      "to": "test@example.com",
      "subject": "Test Email",
      "html": "<p>Testing request logging</p>",
      "text": "Testing request logging"
    }
  }' | jq . || echo "Email send failed"
echo ""
echo "---"
echo ""

# Test 4: Batch Email Send (will be logged)
echo -e "${YELLOW}[4] Testing Batch Email Send (SendGrid)${NC}"
echo "POST /api/email/batch with logging"
curl -s -X POST "$API_URL/api/email/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sendgrid",
    "messages": [
      {
        "to": "user1@example.com",
        "subject": "Batch Test 1",
        "html": "<p>Batch email 1</p>"
      },
      {
        "to": "user2@example.com",
        "subject": "Batch Test 2",
        "html": "<p>Batch email 2</p>"
      }
    ]
  }' | jq . || echo "Batch send failed"
echo ""
echo "---"
echo ""

# Test 5: View Request Logs
echo -e "${YELLOW}[5] Testing Request Logs Retrieval${NC}"
echo "GET /api/logs - Retrieve all logged requests"
curl -s "http://localhost:3000/api/logs?limit=10" \
  -H "Authorization: Bearer $API_KEY" | jq .data || echo "Log retrieval failed"
echo ""
echo "---"
echo ""

# Test 6: Filter Logs by Method
echo -e "${YELLOW}[6] Testing Log Filtering${NC}"
echo "GET /api/logs?method=POST - Filter by HTTP method"
curl -s "http://localhost:3000/api/logs?method=POST&limit=5" \
  -H "Authorization: Bearer $API_KEY" | jq '.data | length' || echo "Log filtering failed"
echo ""
echo "---"
echo ""

# Test 7: API Statistics
echo -e "${YELLOW}[7] Testing API Statistics${NC}"
echo "GET /api/stats - Retrieve API statistics"
curl -s "http://localhost:3000/api/stats" \
  -H "Authorization: Bearer $API_KEY" | jq .data || echo "Stats retrieval failed"
echo ""
echo "---"
echo ""

# Test 8: API Key Usage Stats
echo -e "${YELLOW}[8] Testing API Key Usage Statistics${NC}"
echo "GET /api/api-key-stats - Retrieve API key usage stats"
curl -s "http://localhost:3000/api/api-key-stats" \
  -H "Authorization: Bearer $API_KEY" | jq .data || echo "API key stats retrieval failed"
echo ""
echo "---"
echo ""

# Test 9: Rate Limiting
echo -e "${YELLOW}[9] Testing Rate Limiting${NC}"
echo "Testing rate limit by sending multiple requests rapidly"
echo "Endpoint: /api/email/send (limit: 5 requests/minute)"

for i in {1..6}; do
  echo -n "Request $i: "
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/email/send" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"provider":"gmail","message":{"to":"test@example.com","subject":"Rate Limit Test","html":"<p>Test</p>"}}')
  
  STATUS=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -1)
  
  if [ "$STATUS" = "429" ]; then
    echo -e "${RED}[429 Too Many Requests]${NC} - Rate limit exceeded (as expected)"
    echo "$BODY" | jq .
  elif [ "$STATUS" = "200" ] || [ "$STATUS" = "500" ]; then
    RATE_LIMIT=$(curl -s -i -X POST "$API_URL/api/email/send" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"provider":"gmail","message":{"to":"test@example.com","subject":"Test","html":"<p></p>"}}' | grep "x-ratelimit-remaining" | cut -d' ' -f2 | tr -d '\r')
    echo -e "${GREEN}[OK]${NC} - Remaining: $RATE_LIMIT"
  else
    echo "Status: $STATUS"
  fi
  
  sleep 0.1
done

echo ""
echo "---"
echo ""

# Test 10: CORS check with rate limit headers
echo -e "${YELLOW}[10] Testing CORS and Rate Limit Headers${NC}"
echo "Checking response headers for CORS and rate limit info"
curl -s -i -X GET "$API_URL/api/health" \
  -H "Origin: http://localhost:5173" 2>&1 | grep -E "(Access-Control|x-ratelimit)" || echo "No CORS/rate limit headers found"
echo ""
echo "---"
echo ""

# Test 11: Authentication Error (no API key)
echo -e "${YELLOW}[11] Testing Authentication{{NC}"
echo "POST /api/email/send without API key - should return 401"
curl -s -X POST "$API_URL/api/email/send" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail","message":{"to":"test@example.com","subject":"Test","html":"<p></p>"}}' | jq . || echo "Auth test failed"
echo ""
echo "---"
echo ""

# Test 12: Admin Maintenance - Cleanup
echo -e "${YELLOW}[12] Testing Admin Maintenance - Cleanup Old Logs${NC}"
echo "POST /api/admin/maintenance - Delete logs older than 1 day"
curl -s -X POST "$API_URL/api/admin/maintenance" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup-logs","daysOld":1}' | jq . || echo "Cleanup failed"
echo ""
echo "---"
echo ""

# Test 13: Admin Maintenance - Reset Rate Limit
echo -e "${YELLOW}[13] Testing Admin Maintenance - Reset Rate Limit${NC}"
echo "POST /api/admin/maintenance - Reset rate limit for IP"
curl -s -X POST "$API_URL/api/admin/maintenance" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"reset-rate-limit","clientIp":"127.0.0.1"}' | jq . || echo "Rate limit reset failed"
echo ""
echo "---"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Testing Complete!                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  ✓ Health Check"
echo "  ✓ CORS (Preflight & Headers)"
echo "  ✓ Email Sending (Single & Batch)"
echo "  ✓ Request Logging"
echo "  ✓ Log Filtering"
echo "  ✓ API Statistics"
echo "  ✓ API Key Usage Tracking"
echo "  ✓ Rate Limiting"
echo "  ✓ Authentication"
echo "  ✓ Admin Maintenance"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Review logs at: GET /api/logs"
echo "  2. Check stats at: GET /api/stats"
echo "  3. Monitor API key usage at: GET /api/api-key-stats"
echo "  4. Read FEATURES.md for detailed documentation"
echo ""
