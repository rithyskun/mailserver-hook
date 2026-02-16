import { defineEventHandler, readBody, createError } from 'h3'
import { GmailService } from '~/server/utils/gmail.service'
import { SendGridService } from '~/server/utils/sendgrid.service'
import { EmailProvider } from '~/types/email'
import type { EmailMessage, EmailResponse, EmailProvider as EmailProviderType } from '~/types/email'

interface BatchEmailRequest {
  provider: EmailProviderType
  messages: EmailMessage[]
}

/**
 * POST /api/email/batch
 * Sends multiple emails using the specified provider
 *
 * Request body:
 * {
 *   "provider": "gmail" | "sendgrid",
 *   "messages": [
 *     {
 *       "to": "recipient@example.com",
 *       "subject": "Email subject",
 *       "html": "<p>Email content</p>"
 *     }
 *   ]
 * }
 */
export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody<BatchEmailRequest>(event)

    if (!payload.provider) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { message: 'Provider is required' },
      })
    }

    if (!payload.messages || !Array.isArray(payload.messages) || payload.messages.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { message: 'Messages array is required and must not be empty' },
      })
    }

    const config = useRuntimeConfig()
    const results: EmailResponse[] = []

    if (payload.provider === EmailProvider.GMAIL) {
      if (!config.gmail.clientEmail || !config.gmail.privateKey) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Internal Server Error',
          data: { message: 'Gmail service not configured' },
        })
      }

      const gmailService = new GmailService()
      await gmailService.initializeWithServiceAccount(
        config.gmail.clientEmail,
        config.gmail.privateKey,
      )

      for (const message of payload.messages) {
        const response = await gmailService.sendEmail(message)
        results.push(response)
      }
    } else if (payload.provider === EmailProvider.SENDGRID) {
      if (!config.sendgrid.apiKey) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Internal Server Error',
          data: { message: 'SendGrid service not configured' },
        })
      }

      const sendGridService = new SendGridService()
      await sendGridService.initialize(config.sendgrid.apiKey)

      for (const message of payload.messages) {
        const response = await sendGridService.sendEmail(message)
        results.push(response)
      }
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { message: 'Invalid provider' },
      })
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return {
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Batch email endpoint error:', error)
    throw error
  }
})
