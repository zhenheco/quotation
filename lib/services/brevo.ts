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

class BrevoService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || ''
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      if (!this.apiKey) {
        throw new Error('BREVO_API_KEY is not configured')
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: process.env.COMPANY_NAME || 'Quotation System',
            email: 'noreply@yourdomain.com'
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send email')
      }

      const data = await response.json()

      return {
        success: true,
        messageId: data.messageId,
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

export const brevoService = new BrevoService()
