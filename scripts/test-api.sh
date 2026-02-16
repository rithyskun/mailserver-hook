#!/bin/bash

# Email Web Server Hook - API Testing Script
# This script demonstrates how to test the email webhook API

API_URL="http://localhost:3000"
API_KEY="your-secret-key-here"

echo "=== Email Web Server Hook - API Testing ==="
echo ""

# Test 1: Health Check (No authentication required)
echo "1. Testing Health Check (GET /api/health)"
echo "Command:"
echo "curl $API_URL/api/health"
echo ""
curl -s "$API_URL/api/health" | jq . || echo "Health check failed"
echo ""
echo "---"
echo ""

# Test 2: Send Email via Gmail
echo "2. Testing Send Email via Gmail (POST /api/email/send)"
echo "Command:"
echo 'curl -X POST '"$API_URL"'/api/email/send \'
echo '  -H "Authorization: Bearer '"$API_KEY"'" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{
    "provider": "gmail",
    "message": {
      "to": "recipient@example.com",
      "subject": "Test Email from Gmail",
      "html": "<h1>Hello</h1><p>This is a test email from Gmail</p>",
      "text": "Hello! This is a test email from Gmail"
    }
  }'"'"
echo ""
curl -s -X POST "$API_URL/api/email/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "message": {
      "to": "recipient@example.com",
      "subject": "Test Email from Gmail",
      "html": "<h1>Hello</h1><p>This is a test email from Gmail</p>",
      "text": "Hello! This is a test email from Gmail"
    }
  }' | jq . || echo "Gmail send failed"
echo ""
echo "---"
echo ""

# Test 3: Send Email via SendGrid
echo "3. Testing Send Email via SendGrid (POST /api/email/send)"
echo "Command:"
echo 'curl -X POST '"$API_URL"'/api/email/send \'
echo '  -H "Authorization: Bearer '"$API_KEY"'" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{
    "provider": "sendgrid",
    "message": {
      "to": "recipient@example.com",
      "subject": "Test Email from SendGrid",
      "html": "<h1>Hello</h1><p>This is a test email from SendGrid</p>",
      "text": "Hello! This is a test email from SendGrid"
    }
  }'"'"
echo ""
curl -s -X POST "$API_URL/api/email/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sendgrid",
    "message": {
      "to": "recipient@example.com",
      "subject": "Test Email from SendGrid",
      "html": "<h1>Hello</h1><p>This is a test email from SendGrid</p>",
      "text": "Hello! This is a test email from SendGrid"
    }
  }' | jq . || echo "SendGrid send failed"
echo ""
echo "---"
echo ""

# Test 4: Batch Send Emails
echo "4. Testing Batch Send Emails (POST /api/email/batch)"
echo "Command:"
echo 'curl -X POST '"$API_URL"'/api/email/batch \'
echo '  -H "Authorization: Bearer '"$API_KEY"'" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{
    "provider": "sendgrid",
    "messages": [
      {
        "to": "user1@example.com",
        "subject": "Batch Email 1",
        "html": "<p>First batch email</p>"
      },
      {
        "to": "user2@example.com",
        "subject": "Batch Email 2",
        "html": "<p>Second batch email</p>"
      }
    ]
  }'"'"
echo ""
curl -s -X POST "$API_URL/api/email/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sendgrid",
    "messages": [
      {
        "to": "user1@example.com",
        "subject": "Batch Email 1",
        "html": "<p>First batch email</p>"
      },
      {
        "to": "user2@example.com",
        "subject": "Batch Email 2",
        "html": "<p>Second batch email</p>"
      }
    ]
  }' | jq . || echo "Batch send failed"
echo ""
echo "---"
echo ""

# Test 5: Test Authentication (Missing API Key)
echo "5. Testing Authentication Error (Missing API Key)"
echo "Command:"
echo "curl -X POST $API_URL/api/email/send \\"
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"provider":"gmail","message":{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}}'"'"
echo ""
curl -s -X POST "$API_URL/api/email/send" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail","message":{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}}' | jq . || echo "Auth check passed"
echo ""
echo "---"
echo ""

echo "=== Testing Complete ==="
echo "Note: Update API_KEY to match your actual API_SECRET environment variable"
echo "Note: Update email addresses to valid recipients"
