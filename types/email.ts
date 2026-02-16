// Email provider types
export enum EmailProvider {
  GMAIL = 'gmail',
  SENDGRID = 'sendgrid',
}

// Email message structure
export interface EmailMessage {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

// Email attachment
export interface EmailAttachment {
  filename: string
  content?: string | Buffer
  path?: string
  contentType?: string
}

// Email response
export interface EmailResponse {
  success: boolean
  provider: EmailProvider
  messageId?: string
  error?: string
  timestamp: string
}

// Webhook payload
export interface EmailWebhookPayload {
  apiKey: string
  provider: EmailProvider
  message: EmailMessage
  metadata?: Record<string, any>
}

// API Error response
export interface ApiErrorResponse {
  statusCode: number
  statusMessage: string
  message?: string
  data?: any
}
