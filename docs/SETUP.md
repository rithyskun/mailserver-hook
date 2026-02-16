# Setup Guide - Gmail & SendGrid Integration

## Complete Setup Instructions

### Prerequisites
- Node.js v18+
- Gmail or SendGrid account (or both)
- Google Cloud Project (for Gmail)

---

## Gmail Setup (Google Workspace)

### Step 1: Create Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (e.g., "Email Server Hook")
3. Enable billing (required for API access)

### Step 2: Enable Gmail API

1. Go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on Gmail API
4. Click **Enable**

### Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in the service account details:
   - Service account name: `mailserver-hook`
   - Service account ID: Auto-generated
   - Description: "Email Service Hook"
4. Click **Create and Continue**
5. Grant permissions (Optional - you can skip this)
6. Click **Done**

### Step 4: Generate Private Key

1. Go to **APIs & Services** → **Credentials**
2. Under "Service Accounts", click the created service account
3. Go to **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** as the key type
6. Click **Create** - a JSON file will download

### Step 5: Extract Credentials

Open the downloaded JSON file and extract:
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "mailserver-hook@project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "..."
}
```

### Step 6: Configure Environment Variables

Update your `.env` file:
```env
GMAIL_CLIENT_EMAIL=mailserver-hook@project.iam.gserviceaccount.com
GMAIL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important:** Keep the escaped newlines (`\n`) in the private key.

### Step 7: Test Gmail Integration

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer your-api-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "message": {
      "to": "recipient@example.com",
      "subject": "Test Email",
      "html": "<p>Testing Gmail integration</p>"
    }
  }'
```

---

## SendGrid Setup

### Step 1: Create SendGrid Account

1. Sign up at [SendGrid](https://sendgrid.com)
2. Verify your account via email
3. Complete the verification process

### Step 2: Generate API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name: `mailserver-hook`
4. Permissions:
   - ✅ Mail Send
   - ◻️ Other permissions as needed
5. Click **Create & Close**
6. Copy the API key (you'll only see it once!)

### Step 3: Configure Environment Variables

Update your `.env` file:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Verify Sender Email

1. Go to **Sender Authentication** → **Single Sender Verification**
2. Click **Create New Sender**
3. Fill in your sender information
4. Verify via email link sent to the email address

### Step 5: Test SendGrid Integration

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer your-api-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sendgrid",
    "message": {
      "to": "recipient@example.com",
      "subject": "Test Email",
      "html": "<p>Testing SendGrid integration</p>"
    }
  }'
```

---

## Project Setup

### Installation Steps

```bash
# Navigate to project directory
cd /workspaces/mailserver-hook

# Install pnpm globally (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# (Use your Gmail and/or SendGrid credentials)
nano .env

# Start development server
pnpm dev
```

The server will start at `http://localhost:3000`

---

## Security Best Practices

### 1. API Key Security
- Use a strong, random API_SECRET (at least 32 characters)
- Example: `openssl rand -hex 32`
- Rotate periodically

### 2. Environment Variables
- Never commit `.env` to version control
- Use `.env.local` for local development
- Use different credentials for dev/staging/production

### 3. Credentials Management
- Store sensitive keys in secure vaults (GitHub Secrets, AWS Secrets Manager, etc.)
- Use Environment Variables in production
- Monitor key usage and set expiration dates

### 4. Network Security
- Use HTTPS in production (not HTTP)
- Implement rate limiting
- Use VPC/firewall rules to restrict access

### 5. Monitoring
- Log all email sending attempts
- Monitor API quota usage
- Set up alerts for failures

---

## Troubleshooting

### Gmail Issues

**Error: "Gmail service not initialized"**
- Check `GMAIL_CLIENT_EMAIL` and `GMAIL_PRIVATE_KEY` are set
- Verify private key format (with `\n` newlines)
- Ensure Gmail API is enabled in Google Cloud Console

**Error: "403 Forbidden"**
- Check service account has Gmail API access
- Verify the email address is correctly set
- Try re-downloading the service account key

### SendGrid Issues

**Error: "Invalid API Key"**
- Verify the API key in `.env`
- Check the API key hasn't expired
- Generate a new API key if needed

**Error: "Sender/Email Blocked"**
- Verify sender email domain in SendGrid
- Check email is not blacklisted
- Ensure account has enough credits

### General Issues

**Error: "401 Unauthorized"**
- Check Authorization header format: `Bearer <API_SECRET>`
- Verify API_SECRET value matches `.env`

**Error: "400 Bad Request"**
- Check JSON payload is valid
- Ensure required fields (to, subject) are present
- Verify provider is 'gmail' or 'sendgrid'

---

## Testing

### Using cURL

```bash
# Health check
curl http://localhost:3000/api/health

# Send single email
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail","message":{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}}'

# Batch send
curl -X POST http://localhost:3000/api/email/batch \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"provider":"sendgrid","messages":[{"to":"test1@example.com"},{"to":"test2@example.com"}]}'
```

### Using Postman

1. **Create Environment**
   - Variable: `apiKey` = your API_SECRET
   - Variable: `baseUrl` = http://localhost:3000

2. **Create Request**
   - Method: POST
   - URL: `{{baseUrl}}/api/email/send`
   - Header: `Authorization: Bearer {{apiKey}}`
   - Header: `Content-Type: application/json`
   - Body (raw JSON):
   ```json
   {
     "provider": "gmail",
     "message": {
       "to": "recipient@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }
   }
   ```

### Using the Test Script

```bash
# Make test script executable
chmod +x test-api.sh

# Run tests
./test-api.sh
```

---

## Deployment

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Build Nuxt app
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]
```

Build and run:
```bash
docker build -t mailserver-hook .
docker run -p 3000:3000 \
  -e API_SECRET=your-secret \
  -e GMAIL_CLIENT_EMAIL=... \
  -e GMAIL_PRIVATE_KEY=... \
  -e SENDGRID_API_KEY=... \
  mailserver-hook
```

### Production Environment Variables

Set in your hosting platform (Vercel, AWS, Heroku, etc.):
```
API_SECRET=your-strong-secret
GMAIL_CLIENT_EMAIL=mailserver-hook@project.iam.gserviceaccount.com
GMAIL_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=Your Application
```

---

## Support & Documentation

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference)
- [Nuxt.js Documentation](https://nuxt.com)

Need help? Check the README.md for API examples and troubleshooting.
