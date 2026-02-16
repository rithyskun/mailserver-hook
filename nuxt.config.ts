import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  devtools: { enabled: true },
  typescript: { strict: true },
  runtimeConfig: {
    apiSecret: process.env.API_SECRET || 'your-secret-key-here',
    gmail: {
      clientEmail: process.env.GMAIL_CLIENT_EMAIL,
      privateKey: process.env.GMAIL_PRIVATE_KEY,
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
  experimental: {
    typescriptBundlerResolution: true,
  },
})
