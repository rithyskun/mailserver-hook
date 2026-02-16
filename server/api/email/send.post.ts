import { defineEventHandler, readBody, createError } from 'h3'
import type { H3Event } from 'h3'
import { setResponseStatus } from 'h3'
import { GmailService } from '../../utils/gmail.service'
import { SendGridService } from '../../utils/sendgrid.service'
import { EmailProvider, GmailAuthMethod } from '../../../types/email'
import type { EmailWebhookPayload, EmailResponse, Auth0Config } from '../../../types/email'

/**
 * POST /api/email/send
 * Sends an email using the specified provider (Gmail or SendGrid)
 *
 * Gmail supports both Service Account and Auth0 authentication
 * Set GMAIL_AUTH_METHOD to 'auth0' or 'service-account' in environment
 *
 * Request body:
 * {
 *   "apiKey": "your-api-key",
 *   "provider": "gmail" | "sendgrid",
 *   "message": {
 *     "to": "recipient@example.com",
 *     "subject": "Email subject",
 *     "html": "<p>Email content</p>",
 *     "text": "Email text content"
 *   }
 * }
 */
export default defineEventHandler(async (event): Promise<EmailResponse> => {
  try {
    // Read request body
    const payload = await readBody<EmailWebhookPayload>(event)

    // Validate required fields
    if (!payload.provider) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: {
          message: 'Provider is required (gmail or sendgrid)',
        },
      })
    }

    if (!payload.message) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: {
          message: 'Message object is required',
        },
      })
    }

    // Validate message fields
    if (!payload.message.to || !payload.message.subject) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: {
          message: 'Message must include "to" and "subject" fields',
        },
      })
    }

    const config = useRuntimeConfig(event)
    let response: EmailResponse

    if (payload.provider === EmailProvider.GMAIL) {
      // Gmail service - supports Service Account and Auth0
      const gmailService = new GmailService()
      const authMethod = (config.gmail.authMethod || GmailAuthMethod.SERVICE_ACCOUNT) as string

      if (authMethod === GmailAuthMethod.AUTH0) {
        // Initialize with Auth0
        const auth0Config: Auth0Config = {
          domain: config.auth0.domain,
          clientId: config.auth0.clientId,
          clientSecret: config.auth0.clientSecret,
          userId: config.gmail.auth0UserId,
          audience: config.gmail.auth0Audience,
        }

        // Validate Auth0 configuration
        if (!auth0Config.domain || !auth0Config.clientId || !auth0Config.clientSecret) {
          throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            data: {
              message: 'Auth0 configuration incomplete. Check AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET',
            },
          })
        }

        const gmailUserEmail = payload.message.from || config.gmail.userEmail
        if (!gmailUserEmail) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            data: {
              message: 'Gmail user email required in message.from or GMAIL_USER_EMAIL config',
            },
          })
        }

        await gmailService.initializeWithAuth0(auth0Config, gmailUserEmail)
      } else {
        // Initialize with Service Account (default)
        if (!config.gmail.clientEmail || !config.gmail.privateKey) {
          throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            data: {
              message: 'Gmail service not configured. Set GMAIL_CLIENT_EMAIL and GMAIL_PRIVATE_KEY',
            },
          })
        }

        await gmailService.initializeWithServiceAccount(
          config.gmail.clientEmail,
          config.gmail.privateKey,
        )
      }

      response = await gmailService.sendEmail(payload.message)
    } else if (payload.provider === EmailProvider.SENDGRID) {
      // SendGrid service
      if (!config.sendgrid.apiKey) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Internal Server Error',
          data: {
            message: 'SendGrid service not configured',
          },
        })
      }

      const sendGridService = new SendGridService()
      await sendGridService.initialize(config.sendgrid.apiKey)

      response = await sendGridService.sendEmail(payload.message)
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: {
          message: `Invalid provider: ${payload.provider}. Must be 'gmail' or 'sendgrid'`,
        },
      })
    }

    // Log the response
    console.log(`[${new Date().toISOString()}] Email sent via ${payload.provider}:`, response)

    // Set response status based on success
    if (!response.success) {
      event.node.res.statusCode = 500
    }

    return response
  } catch (error) {
    console.error('Email send endpoint error:', error)
    throw error
  }
})
