# Auth0 Integration for Gmail Service

## Overview

The Gmail service now supports **two authentication methods**:
1. **Service Account** (Default) - Uses Google Service Account credentials
2. **Auth0** - Uses Auth0 for identity and token management

This allows you to manage Gmail access through Auth0's centralized identity platform, providing better flexibility and security.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Choose authentication method: "service-account" or "auth0"
GMAIL_AUTH_METHOD=auth0

# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Gmail-specific Auth0 settings
GMAIL_AUTH0_USER_ID=your-gmail-user-id
GMAIL_AUTH0_AUDIENCE=https://www.googleapis.com/auth/gmail.send
GMAIL_USER_EMAIL=your-gmail@gmail.com
```

### Service Account (Default)

If you prefer to use Service Account authentication, set:

```env
GMAIL_AUTH_METHOD=service-account
GMAIL_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GMAIL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

## Auth0 Setup

### 1. Create an Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Create a new **Machine-to-Machine (M2M)** application
3. Note down your:
   - **Domain** (e.g., `your-tenant.auth0.com`)
   - **Client ID**
   - **Client Secret**

### 2. Configure Google Connection in Auth0

1. Go to **Connections** → **Enterprise** → **Google Workspace** (or Google)
2. Set up a connection for your Gmail account
3. Configure Auth0 to have authorization to send emails on behalf of your Gmail account

### 3. Grant Gmail API Access

Ensure your Auth0 application has the necessary scopes to access Gmail API:
- `https://www.googleapis.com/auth/gmail.send` (minimum required)
- Configure this in the `GMAIL_AUTH0_AUDIENCE` environment variable

## Usage

Once configured, the system automatically uses the appropriate authentication method based on `GMAIL_AUTH_METHOD`:

### API Request

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "provider": "gmail",
    "message": {
      "from": "sender@gmail.com",
      "to": "recipient@example.com",
      "subject": "Hello",
      "html": "<p>This is an email sent via Auth0</p>",
      "text": "This is an email sent via Auth0"
    }
  }'
```

### Code Example

```typescript
import { GmailService } from '~/server/utils/gmail.service'
import type { Auth0Config } from '~/types/email'

const gmailService = new GmailService()

const auth0Config: Auth0Config = {
  domain: 'your-tenant.auth0.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  audience: 'https://www.googleapis.com/auth/gmail.send'
}

await gmailService.initializeWithAuth0(auth0Config, 'sender@gmail.com')

const response = await gmailService.sendEmail({
  to: 'recipient@example.com',
  subject: 'Hello from Auth0',
  html: '<p>This email was sent using Auth0 authentication</p>'
})
```

## How It Works

1. **Token Generation**: When initialized with Auth0, the service uses the OAuth 2.0 Client Credentials flow to obtain an access token
2. **Token Management**: The service automatically refreshes tokens before they expire (checks every 5 minutes)
3. **Email Sending**: Uses the valid token to authenticate with Gmail API via nodemailer

### Token Flow Diagram

```
Auth0 Client
    ↓
1. Request: client_credentials grant
    ↓
2. Auth0 validates credentials
    ↓
3. Returns access_token (expires_in: 86400s)
    ↓
4. Token stored in GmailService
    ↓
5. Token checked before each email send
    ↓
6. Auto-refresh if within 5 min of expiry
```

## Advantages of Auth0

- ✅ Centralized identity management
- ✅ No need to store and manage service account credentials
- ✅ Built-in token lifecycle management
- ✅ Easy integration with other Auth0-managed services
- ✅ Better audit trails and security policies
- ✅ Support for additional security features (MFA, conditional access)

## Troubleshooting

### "Auth0 token refresh failed"

**Cause**: Invalid Auth0 credentials or misconfigured domain

**Fix**:
1. Verify `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
2. Confirm the application exists in Auth0 dashboard
3. Check that the application has the correct credentials in your environment

### "Gmail user email required"

**Cause**: Missing `from` field in message or `GMAIL_USER_EMAIL` config

**Fix**: 
1. Include `from` field in email message
2. Or set `GMAIL_USER_EMAIL` environment variable
3. Ensure the email address matches your Gmail account

### "Auth0 configuration incomplete"

**Cause**: Missing Auth0 environment variables

**Fix**: Ensure all required Auth0 variables are set:
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

## Migration from Service Account

To migrate from Service Account to Auth0:

1. **Backup existing config**:
   ```env
   # Keep these for fallback
   GMAIL_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GMAIL_PRIVATE_KEY="..."
   ```

2. **Add Auth0 config**:
   ```env
   GMAIL_AUTH_METHOD=auth0
   AUTH0_DOMAIN=your-tenant.auth0.com
   # ... other Auth0 vars
   ```

3. **Test thoroughly** before removing service account credentials

4. **Switch back if needed** by changing `GMAIL_AUTH_METHOD=service-account`

## Environment Variables Reference

| Variable | Required (Auth0) | Description |
|----------|------------------|-------------|
| `GMAIL_AUTH_METHOD` | No | Set to `"auth0"` to use Auth0 (default: `"service-account"`) |
| `AUTH0_DOMAIN` | Yes | Your Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Yes | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Yes | Auth0 application client secret |
| `GMAIL_USER_EMAIL` | No | Default Gmail address to send from |
| `GMAIL_AUTH0_USER_ID` | No | Associated Auth0 user ID |
| `GMAIL_AUTH0_AUDIENCE` | No | OAuth audience (default: Gmail Send scope) |

## Security Best Practices

1. **Never commit credentials**: Keep `.env` out of version control
2. **Rotate secrets**: Regularly rotate Auth0 client secrets
3. **Use environment variables**: Never hardcode credentials
4. **Monitor logs**: Check server logs for authentication errors
5. **Limit scopes**: Only request necessary Gmail API scopes
6. **Use HTTPS**: Always use HTTPS in production
7. **Rate limiting**: Enable rate limiting to prevent abuse

## Support

For issues or questions:
1. Check the [Main Documentation](./README.md)
2. Review [Features Documentation](./FEATURES.md)
3. Check Auth0 logs in your dashboard
4. Review server logs for detailed error messages
