import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import type { EmailMessage, EmailResponse, EmailProvider, Auth0Config } from '../../types/email'
import { GmailAuthMethod } from '../../types/email'

// Import axios dynamically to avoid SSR issues
let axios: any

/**
 * Gmail email service supporting both Service Account and Auth0 authentication
 * - Service Account: Uses Google Service Account credentials
 * - Auth0: Uses Auth0 for authentication and token management
 */
export class GmailService {
  private transporter: nodemailer.Transporter | null = null
  private authMethod: string | null = null
  private auth0Config: Auth0Config | null = null
  private accessToken: string | null = null
  private tokenExpires: number = 0

  /**
   * Initialize Gmail service with Service Account credentials
   */
  async initializeWithServiceAccount(
    clientEmail: string,
    privateKey: string,
  ): Promise<void> {
    try {
      const key = privateKey.replace(/\\n/g, '\n')

      const auth = new google.auth.JWT({
        email: clientEmail,
        key: key,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
      })

      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          type: 'OAuth2',
          user: clientEmail,
          serviceClient: clientEmail,
          privateKey: key,
          accessToken: (await auth.getAccessToken()).token || '',
        },
      } as any)

      this.authMethod = 'service-account'
      console.log('Gmail service initialized with Service Account')
    } catch (error) {
      console.error('Failed to initialize Gmail service with Service Account:', error)
      throw new Error('Gmail service initialization failed')
    }
  }

  /**
   * Initialize Gmail service with Auth0 credentials
   */
  async initializeWithAuth0(config: Auth0Config, gmailUserEmail: string): Promise<void> {
    try {
      // Lazy load axios to avoid SSR issues
      if (!axios) {
        const axiosModule = await import('axios')
        axios = axiosModule.default
      }

      this.auth0Config = config
      this.authMethod = 'auth0'

      // Get initial access token
      await this.refreshAuth0Token()

      // Create transporter with Auth0-managed access token
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          type: 'OAuth2',
          user: gmailUserEmail,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          accessToken: this.accessToken!,
          refreshToken: undefined,
        },
      } as any)

      console.log('Gmail service initialized with Auth0')
    } catch (error) {
      console.error('Failed to initialize Gmail service with Auth0:', error)
      throw new Error('Gmail Auth0 initialization failed')
    }
  }

  /**
   * Get Auth0 access token using client credentials flow
   */
  private async refreshAuth0Token(): Promise<void> {
    if (!this.auth0Config) {
      throw new Error('Auth0 configuration not set')
    }

    // Lazy load axios if not already loaded
    if (!axios) {
      const axiosModule = await import('axios')
      axios = axiosModule.default
    }

    try {
      const response = await axios.post(`https://${this.auth0Config.domain}/oauth/token`, {
        client_id: this.auth0Config.clientId,
        client_secret: this.auth0Config.clientSecret,
        audience: this.auth0Config.audience || 'https://www.googleapis.com/auth/gmail.send',
        grant_type: 'client_credentials',
      })

      this.accessToken = response.data.access_token
      this.tokenExpires = Date.now() + (response.data.expires_in * 1000)

      console.log('Auth0 access token refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh Auth0 token:', error)
      throw new Error('Auth0 token refresh failed')
    }
  }

  /**
   * Check if Auth0 token needs refresh
   */
  private async ensureValidToken(): Promise<void> {
    if (this.authMethod !== 'auth0') {
      return
    }

    // Refresh token if it's within 5 minutes of expiration
    if (Date.now() >= this.tokenExpires - (5 * 60 * 1000)) {
      await this.refreshAuth0Token()
    }
  }

  /**
   * Send email using configured authentication method
   */
  async sendEmail(
    message: EmailMessage,
  ): Promise<EmailResponse> {
    if (!this.transporter) {
      throw new Error('Gmail service not initialized')
    }

    try {
      // Ensure valid Auth0 token if using Auth0
      await this.ensureValidToken()

      // Update transporter with current access token if using Auth0
      if (this.authMethod === 'auth0' && this.accessToken) {
        const transporterConfig = this.transporter.get('auth')
        if (transporterConfig && typeof transporterConfig === 'object') {
          (transporterConfig as any).accessToken = this.accessToken
        }
      }

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

  /**
   * Get current authentication method
   */
  getAuthMethod(): string | null {
    return this.authMethod
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.transporter !== null
  }
}

export const createGmailService = (): GmailService => {
  return new GmailService()
}
