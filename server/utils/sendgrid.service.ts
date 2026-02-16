import sgMail from '@sendgrid/mail'
import type { EmailMessage, EmailResponse, EmailProvider } from '~/types/email'

/**
 * SendGrid email service
 * Requires SendGrid API key
 */
export class SendGridService {
  private initialized: boolean = false

  async initialize(apiKey: string): Promise<void> {
    try {
      sgMail.setApiKey(apiKey)
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize SendGrid service:', error)
      throw new Error('SendGrid service initialization failed')
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    if (!this.initialized) {
      throw new Error('SendGrid service not initialized')
    }

    try {
      const mailOptions = {
        to: Array.isArray(message.to) ? message.to : [message.to],
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined,
        from: message.from || 'noreply@example.com',
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((att: any) => ({
          filename: att.filename,
          content: att.content ? (typeof att.content === 'string' ? att.content : att.content.toString('base64')) : undefined,
          path: att.path,
          type: att.contentType,
        })),
      }

      const response = await sgMail.send(mailOptions)

      return {
        success: true,
        provider: 'sendgrid' as EmailProvider,
        messageId: response[0].headers['x-message-id'],
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('SendGrid send error:', error)
      return {
        success: false,
        provider: 'sendgrid' as EmailProvider,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  }
}

export const createSendGridService = (): SendGridService => {
  return new SendGridService()
}
