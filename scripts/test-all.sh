#!/bin/bash

# Comprehensive API Test Suite for Email Web Server Hook
# Tests all endpoints with proper error handling and reporting

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-your-secret-key-here}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run a test
run_test() {
  local test_name="$1"
  local expected_status="$2"
  shift 2
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${CYAN}[TEST $TOTAL_TESTS]${NC} $test_name"
  
  # Run curl and capture response
  RESPONSE=$(curl -s -w "\n%{http_code}" "$@")
  STATUS=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  # Check status code
  if [ "$STATUS" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Status: $STATUS)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Pretty print JSON response if available
    if echo "$BODY" | jq . >/dev/null 2>&1; then
      echo "$BODY" | jq -C . | head -20
    else
      echo "$BODY" | head -10
    fi
  else
    echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $STATUS)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo "Response:"
    echo "$BODY" | head -20
  fi
  
  echo ""
  echo "---"
  echo ""
}

# Print header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Email Web Server Hook - Comprehensive Test Suite        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "API URL: $API_URL"
echo "API Key: ${API_KEY:0:10}..."
echo ""
echo "Starting tests..."
echo ""

# ============================================================================
# PUBLIC ENDPOINTS (No Auth Required)
# ============================================================================

echo -e "${YELLOW}═══ PUBLIC ENDPOINTS ═══${NC}"
echo ""

run_test "Health Check" "200" \
  "$API_URL/api/health"

# ============================================================================
# AUTHENTICATION TESTS
# ============================================================================

echo -e "${YELLOW}═══ AUTHENTICATION TESTS ═══${NC}"
echo ""

run_test "Missing Authorization Header" "401" \
  -X POST "$API_URL/api/email/send" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail","message":{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}}'

run_test "Invalid API Key" "401" \
  -X POST "$API_URL/api/email/send" \
  -H "Authorization: Bearer invalid-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail","message":{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}}'

# ============================================================================
# EMAIL ENDPOINTS
# ============================================================================

echo -e "${YELLOW}═══ EMAIL ENDPOINTS ═══${NC}"
echo ""

run_test "Send Email - Missing Provider" "400" \
  -X POST "$API_URL/api/email/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}}'

run_test "Send Email - Invalid Provider" "400" \
  -X POST "$API_URL/api/email/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider":"invalid","message":{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}}'

run_test "Send Email - Missing Message Fields" "400" \
  -X POST "$API_URL/api/email/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail","message":{"to":"test@example.com"}}'

run_test "Send Email via Gmail (Valid)" "200" \
  -X POST "$API_URL/api/email/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "message": {
      "to": "test@example.com",
      "subject": "Test Email from Automated Test",
      "html": "<h1>Test Email</h1><p>This is an automated test email.</p>",
      "text": "Test Email - This is an automated test email."
    }
  }'

run_test "Send Email via SendGrid (Valid)" "200" \
  -X POST "$API_URL/api/email/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sendgrid",
    "message": {
      "to": "test@example.com",
      "subject": "Test Email from SendGrid",
      "html": "<h1>SendGrid Test</h1><p>This is a test email via SendGrid.</p>",
      "text": "SendGrid Test - This is a test email via SendGrid."
    }
  }'

# ============================================================================
# BATCH EMAIL ENDPOINTS
# ============================================================================

echo -e "${YELLOW}═══ BATCH EMAIL ENDPOINTS ═══${NC}"
echo ""

run_test "Batch Email - Empty Messages Array" "400" \
  -X POST "$API_URL/api/email/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail","messages":[]}'

run_test "Batch Email - Missing Provider" "400" \
  -X POST "$API_URL/api/email/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}]}'

run_test "Batch Email via Gmail (Valid)" "200" \
  -X POST "$API_URL/api/email/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "messages": [
      {
        "to": "user1@example.com",
        "subject": "Batch Test Email 1",
        "html": "<p>First batch email</p>",
        "text": "First batch email"
      },
      {
        "to": "user2@example.com",
        "subject": "Batch Test Email 2",
        "html": "<p>Second batch email</p>",
        "text": "Second batch email"
      }
    ]
  }'

# ============================================================================
# ANALYTICS & LOGGING ENDPOINTS
# ============================================================================

echo -e "${YELLOW}═══ ANALYTICS & LOGGING ENDPOINTS ═══${NC}"
echo ""

run_test "Get Request Logs" "200" \
  "$API_URL/api/logs?limit=10" \
  -H "Authorization: Bearer $API_KEY"

run_test "Get Logs - Filter by Method" "200" \
  "$API_URL/api/logs?method=POST&limit=5" \
  -H "Authorization: Bearer $API_KEY"

run_test "Get Logs - Filter by Status" "200" \
  "$API_URL/api/logs?status=200&limit=5" \
  -H "Authorization: Bearer $API_KEY"

run_test "Get API Statistics" "200" \
  "$API_URL/api/stats" \
  -H "Authorization: Bearer $API_KEY"

run_test "Get API Key Usage Stats" "200" \
  "$API_URL/api/api-key-stats" \
  -H "Authorization: Bearer $API_KEY"

# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

echo -e "${YELLOW}═══ ADMIN ENDPOINTS ═══${NC}"
echo ""

run_test "Admin Maintenance - Invalid Action" "400" \
  -X POST "$API_URL/api/admin/maintenance" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"invalid-action"}'

run_test "Admin Maintenance - Cleanup Old Logs" "200" \
  -X POST "$API_URL/api/admin/maintenance" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup-logs","daysOld":30}'

run_test "Admin Maintenance - Reset Rate Limit" "200" \
  -X POST "$API_URL/api/admin/maintenance" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"reset-rate-limit","clientIp":"127.0.0.1"}'

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      TEST SUMMARY                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests:  ${CYAN}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
  exit 1
fi
