# Quick Start: Auth0 Gmail Integration

This guide walks you through setting up Auth0 as your Gmail authentication provider in 5 minutes.

## Prerequisites

- Auth0 account (free tier available at [auth0.com](https://auth0.com))
- Gmail account
- Your mailserver-hook instance running locally or deployed

## Step 1: Create Auth0 Application (2 minutes)

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Click **Applications** in the sidebar
3. Click **+ Create Application**
4. Fill in details:
   - **Name**: `Mailserver Hook` (or your app name)
   - **Application Type**: Select **Machine to Machine Applications**
5. Click **Create**

## Step 2: Get Credentials (1 minute)

1. You're now in your application settings
2. Find these values on the **Settings** tab:
   - **Domain**: Shows as `<your-tenant>.auth0.com`
   - **Client ID**: Long alphanumeric string
   - **Client Secret**: Long alphanumeric string with dashes

3. Copy these values - you'll need them next

## Step 3: Configure Environment (1 minute)

Update your `.env` file:

```env
# Switch to Auth0 authentication
GMAIL_AUTH_METHOD=auth0

# Add your Auth0 credentials
AUTH0_DOMAIN=your-actual-domain.auth0.com
AUTH0_CLIENT_ID=your-actual-client-id
AUTH0_CLIENT_SECRET=your-actual-client-secret

# Your Gmail address (where emails will come from)
GMAIL_USER_EMAIL=your-email@gmail.com
```

## Step 4: Verify Installation (1 minute)

Make sure dependencies are installed:

```bash
pnpm install
```

This installs the new `@auth0/auth0-node` and `axios` packages.

## Step 5: Test (Optional)

Test your setup with:

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "provider": "gmail",
    "message": {
      "from": "your-email@gmail.com",
      "to": "test@example.com",
      "subject": "Auth0 Test Email",
      "html": "<p>If you see this, Auth0 auth is working!</p>"
    }
  }'
```

## What Happens Behind the Scenes

1. Request received → Provider set to `gmail`
2. System checks: `GMAIL_AUTH_METHOD=auth0`
3. Connects to Auth0 and requests access token
4. Uses token to authenticate with Gmail API
5. Sends email on your behalf

## Troubleshooting

### "Failed to refresh Auth0 token"

Check your credentials:
```bash
# In .env, verify these are exactly correct:
echo $AUTH0_DOMAIN
echo $AUTH0_CLIENT_ID
echo $AUTH0_CLIENT_SECRET
```

### "Auth0 configuration incomplete"

Make sure all three Auth0 variables are set in `.env`

### Still having issues?

1. Check server logs: `npm run dev`
2. Verify `.env` file is in project root
3. Restart dev server after changing `.env`
4. See [Full Auth0 Documentation](./AUTH0-INTEGRATION.md)

## Next Steps

- **Add More Emails**: Use any Gmail account with your Auth0 tenant
- **Production Deployment**: Update `.env` in production environment
- **Security**: See [AUTH0-INTEGRATION.md](./AUTH0-INTEGRATION.md) security section
- **Monitoring**: Check Auth0 logs for authentication events

## Roll Back to Service Account (if needed)

Change one line in `.env`:

```env
GMAIL_AUTH_METHOD=service-account
```

Then add your service account credentials:
```env
GMAIL_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GMAIL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Done! Your mailserver-hook now works with Auth0.
