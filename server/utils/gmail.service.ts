import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import type { EmailMessage, EmailResponse, EmailProvider } from '~/types/email'

/**
 * Gmail email service using Google API
 * Requires service account credentials
 */
export class GmailService {
  private transporter: nodemailer.Transporter | null = null

  async initialize(
    clientEmail: string,
    privateKey: string,
  ): Promise<void> {
    try {
      // Parse the private key properly
      const key = privateKey.replace(/\\n/g, '\n')

      const auth = new google.auth.JWT({
        email: clientEmail,
        key: key,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
      })

      // Create transporter with OAuth2
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: clientEmail,
          serviceClient: clientEmail,
          privateKey: key,
          accessToken: await auth.getAccessToken(),
        },
      })
    } catch (error) {
      console.error('Failed to initialize Gmail service:', error)
      throw new Error('Gmail service initialization failed')
    }
  }

  async sendEmail(
    message: EmailMessage,
  ): Promise<EmailResponse> {
    if (!this.transporter) {
      throw new Error('Gmail service not initialized')
    }

    try {
      const mailOptions = {
        from: message.from,
        to: Array.isArray(message.to) ? message.to.join(',') : message.to,
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc.join(',') : message.cc) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.join(',') : message.bcc) : undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments,
      }

      const info = await this.transporter.sendMail(mailOptions)

      return {
        success: true,
        provider: 'gmail' as EmailProvider,
        messageId: info.messageId,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Gmail send error:', error)
      return {
        success: false,
        provider: 'gmail' as EmailProvider,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  }
}

export const createGmailService = (): GmailService => {
  return new GmailService()
}
