import nodemailer from 'nodemailer'

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

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter
    }

    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD

    if (!user || !pass) {
      throw new Error('Email configuration is missing. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.')
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    })

    await this.transporter.verify()

    return this.transporter
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const transporter = await this.getTransporter()

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      }

      const info = await transporter.sendMail(mailOptions)

      return {
        success: true,
        messageId: info.messageId,
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

export const emailService = new EmailService()
