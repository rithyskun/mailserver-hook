import { defineEventHandler, readBody, createError } from 'h3'
import type { H3Event } from 'h3'
import { setResponseStatus } from 'h3'
import { GmailService } from '~/server/utils/gmail.service'
import { SendGridService } from '~/server/utils/sendgrid.service'
import { EmailProvider } from '~/types/email'
import type { EmailWebhookPayload, EmailResponse } from '~/types/email'

/**
 * POST /api/email/send
 * Sends an email using the specified provider (Gmail or SendGrid)
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
      // Gmail service
      if (!config.gmail.clientEmail || !config.gmail.privateKey) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Internal Server Error',
          data: {
            message: 'Gmail service not configured',
          },
        })
      }

      const gmailService = new GmailService()
      await gmailService.initialize(
        config.gmail.clientEmail,
        config.gmail.privateKey,
      )

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
