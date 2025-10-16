/**
 * Gmail Email 發送服務
 * 使用 Nodemailer 透過 Gmail SMTP 發送報價單
 */

import nodemailer from 'nodemailer'
import { createElement } from 'react'
import { render } from '@react-email/components'
import { QuotationEmailTemplate } from './templates/QuotationEmailTemplate'

interface SendQuotationEmailParams {
  to: string
  locale: 'zh' | 'en'
  quotationData: {
    recipientName: string
    recipientEmail: string
    quotationNumber: string
    issueDate: string
    validUntil: string
    currency: string
    items: Array<{
      name: string
      description?: string
      quantity: number
      unitPrice: number
      discount: number
      subtotal: number
    }>
    subtotal: number
    taxRate: number
    taxAmount: number
    totalAmount: number
    notes?: string
  }
  senderInfo: {
    companyName: string
    senderName: string
    senderEmail: string
  }
  urls: {
    viewUrl: string
    downloadUrl: string
  }
}

// 檢查是否使用 Gmail
const isGmailConfigured = () => {
  return process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
}

// 檢查是否使用 Resend (保留向後相容)
const isResendConfigured = () => {
  return process.env.RESEND_API_KEY
}

/**
 * 創建 Gmail 傳輸器
 */
function createGmailTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail configuration missing. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })
}

/**
 * 發送報價單 Email (支援 Gmail 和 Resend)
 */
export async function sendQuotationEmail(params: SendQuotationEmailParams) {
  const { to, locale, quotationData, senderInfo, urls } = params

  // 準備 Email 主旨
  const subject = locale === 'zh'
    ? `報價單 #${quotationData.quotationNumber} - ${senderInfo.companyName}`
    : `Quotation #${quotationData.quotationNumber} - ${senderInfo.companyName}`

  // 準備模板參數
  const templateProps = {
    locale,
    recipientName: quotationData.recipientName,
    recipientEmail: quotationData.recipientEmail,
    quotationNumber: quotationData.quotationNumber,
    issueDate: quotationData.issueDate,
    validUntil: quotationData.validUntil,
    currency: quotationData.currency,
    items: quotationData.items,
    subtotal: quotationData.subtotal,
    taxRate: quotationData.taxRate,
    taxAmount: quotationData.taxAmount,
    totalAmount: quotationData.totalAmount,
    notes: quotationData.notes,
    senderName: senderInfo.senderName,
    senderEmail: senderInfo.senderEmail,
    companyName: senderInfo.companyName,
    viewUrl: urls.viewUrl,
    downloadUrl: urls.downloadUrl
  }

  // 渲染 Email HTML
  const emailHtml = render(
    createElement(QuotationEmailTemplate, templateProps)
  )

  try {
    // 優先使用 Gmail，如果沒設定則使用 Resend
    if (isGmailConfigured()) {
      // 使用 Gmail 發送
      console.log('📧 使用 Gmail 發送郵件...')
      const transporter = createGmailTransporter()

      const mailOptions = {
        from: `${senderInfo.companyName} <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: emailHtml,
        // 可選：純文字版本
        text: generatePlainText(templateProps)
      }

      const info = await transporter.sendMail(mailOptions)
      console.log('✅ Gmail 發送成功:', info.messageId)

      return {
        success: true,
        messageId: info.messageId,
        provider: 'gmail'
      }

    } else if (isResendConfigured()) {
      // 使用 Resend 發送 (保留向後相容)
      console.log('📧 使用 Resend 發送郵件...')
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      const { data, error } = await resend.emails.send({
        from: `${senderInfo.companyName} <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
        to: [to],
        subject,
        html: emailHtml
      })

      if (error) {
        throw new Error(error.message)
      }

      console.log('✅ Resend 發送成功:', data?.id)

      return {
        success: true,
        messageId: data?.id,
        provider: 'resend'
      }

    } else {
      throw new Error(
        'No email service configured. Please set either Gmail (GMAIL_USER, GMAIL_APP_PASSWORD) or Resend (RESEND_API_KEY) in .env.local'
      )
    }

  } catch (error: any) {
    console.error('❌ Email 發送失敗:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email',
      provider: isGmailConfigured() ? 'gmail' : 'resend'
    }
  }
}

/**
 * 生成純文字版本的 Email 內容
 */
function generatePlainText(props: any): string {
  const { locale, quotationNumber, recipientName, items, totalAmount, currency, companyName } = props

  if (locale === 'zh') {
    return `
報價單 #${quotationNumber}

親愛的 ${recipientName}：

感謝您的詢價。以下是您的報價單詳情：

項目列表：
${items.map((item: any) => `- ${item.name} x ${item.quantity} = ${currency} ${item.subtotal}`).join('\n')}

總金額：${currency} ${totalAmount}

此報價單由 ${companyName} 提供

如有任何問題，請隨時與我們聯繫。

祝商祺
${companyName}
    `.trim()
  } else {
    return `
Quotation #${quotationNumber}

Dear ${recipientName},

Thank you for your inquiry. Here are your quotation details:

Items:
${items.map((item: any) => `- ${item.name} x ${item.quantity} = ${currency} ${item.subtotal}`).join('\n')}

Total Amount: ${currency} ${totalAmount}

This quotation is provided by ${companyName}

Please feel free to contact us if you have any questions.

Best regards,
${companyName}
    `.trim()
  }
}

/**
 * 測試 Email 連線
 */
export async function testEmailConnection(): Promise<{ success: boolean; message: string }> {
  try {
    if (isGmailConfigured()) {
      const transporter = createGmailTransporter()
      await transporter.verify()
      return {
        success: true,
        message: 'Gmail connection successful'
      }
    } else if (isResendConfigured()) {
      // Resend 不需要驗證連線
      return {
        success: true,
        message: 'Resend API key configured'
      }
    } else {
      return {
        success: false,
        message: 'No email service configured'
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Connection test failed'
    }
  }
}