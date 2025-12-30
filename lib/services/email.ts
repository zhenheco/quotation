/**
 * Email Service - 使用 Brevo REST API
 *
 * 兼容 Cloudflare Workers（純 HTTP，無需 Node.js APIs）
 *
 * 環境變數：
 * - BREVO_API_KEY: Brevo API 金鑰
 * - BREVO_SENDER_EMAIL: 寄件人 email（需在 Brevo 驗證）
 * - BREVO_SENDER_NAME: 寄件人名稱（可選）
 */

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

interface BrevoSendEmailPayload {
  sender: {
    email: string
    name?: string
  }
  to: Array<{ email: string; name?: string }>
  subject: string
  htmlContent: string
  textContent?: string
}

interface BrevoSuccessResponse {
  messageId: string
}

interface BrevoErrorResponse {
  code: string
  message: string
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

class EmailService {
  private getConfig() {
    const apiKey = process.env.BREVO_API_KEY?.trim()
    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim()
    const senderName = process.env.BREVO_SENDER_NAME?.trim()

    if (!apiKey) {
      throw new Error('BREVO_API_KEY environment variable is not configured')
    }

    if (!senderEmail) {
      throw new Error('BREVO_SENDER_EMAIL environment variable is not configured')
    }

    return { apiKey, senderEmail, senderName }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const { apiKey, senderEmail, senderName } = this.getConfig()

      const payload: BrevoSendEmailPayload = {
        sender: {
          email: senderEmail,
          name: senderName || senderEmail,
        },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
      }

      if (options.text) {
        payload.textContent = options.text
      }

      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json() as BrevoErrorResponse
        console.error('Brevo API error:', errorData)
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json() as BrevoSuccessResponse

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

      // Brevo 免費方案每日 300 封，加入小延遲避免 rate limit
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }
}

export const emailService = new EmailService()
