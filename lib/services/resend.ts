export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

class ResendService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || ''
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      if (!this.apiKey) {
        throw new Error('RESEND_API_KEY is not configured')
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${process.env.COMPANY_NAME || 'Quotation System'} <quotations@yourdomain.com>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send email')
      }

      const data = await response.json()

      return {
        success: true,
        messageId: data.id,
      }
    } catch (error: unknown) {
      console.error('Email send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = []

    for (const email of emails) {
      const result = await this.sendEmail(email)
      results.push(result)

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }
}

export const resendService = new ResendService()
