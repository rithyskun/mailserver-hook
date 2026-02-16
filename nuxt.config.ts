import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  devtools: { enabled: true },
  typescript: { strict: true },
  runtimeConfig: {
    apiSecret: process.env.API_SECRET || 'your-secret-key-here',
    gmail: {
      authMethod: process.env.GMAIL_AUTH_METHOD || 'service-account',
      clientEmail: process.env.GMAIL_CLIENT_EMAIL,
      privateKey: process.env.GMAIL_PRIVATE_KEY,
      userEmail: process.env.GMAIL_USER_EMAIL,
      auth0UserId: process.env.GMAIL_AUTH0_USER_ID,
      auth0Audience: process.env.GMAIL_AUTH0_AUDIENCE || 'https://www.googleapis.com/auth/gmail.send',
    },
    auth0: {
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    },
    public: {
      appName: 'Email Web Server Hook',
    },
  },
  nitro: {
    prerender: { crawlLinks: false },
    cors: true,
    compatibilityDate: '2026-02-16',
  },
})
