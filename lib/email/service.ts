import { Resend } from 'resend'
import QuotationEmailTemplate from './templates/QuotationEmailTemplate'
import { render } from '@react-email/render'
import { createElement } from 'react'

// 初始化 Resend
const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendQuotationEmailParams {
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

export async function sendQuotationEmail(params: SendQuotationEmailParams) {
  const { to, locale, quotationData, senderInfo, urls } = params

  // 準備模板數據
  const templateProps = {
    locale,
    ...quotationData,
    ...senderInfo,
    ...urls,
  }

  // 根據語言設置主題
  const subject = locale === 'zh'
    ? `報價單 - ${quotationData.quotationNumber}`
    : `Quotation - ${quotationData.quotationNumber}`

  try {
    // 渲染 Email HTML
    const emailHtml = render(
      createElement(QuotationEmailTemplate, templateProps)
    )

    // 發送 Email
    const { data, error } = await resend.emails.send({
      from: `${senderInfo.companyName} <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
      to: [to],
      subject: subject,
      html: emailHtml,
      reply_to: senderInfo.senderEmail,
    })

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// 發送測試 Email 的輔助函數
export async function sendTestEmail(to: string, locale: 'zh' | 'en' = 'zh') {
  const testData: SendQuotationEmailParams = {
    to,
    locale,
    quotationData: {
      recipientName: locale === 'zh' ? '測試客戶' : 'Test Customer',
      recipientEmail: to,
      quotationNumber: 'QT-2025-TEST',
      issueDate: new Date().toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US'),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
        locale === 'zh' ? 'zh-TW' : 'en-US'
      ),
      currency: 'TWD',
      items: [
        {
          name: locale === 'zh' ? '測試產品 A' : 'Test Product A',
          description: locale === 'zh' ? '這是測試產品的描述' : 'This is a test product description',
          quantity: 2,
          unitPrice: 1000,
          discount: 100,
          subtotal: 1900,
        },
        {
          name: locale === 'zh' ? '測試服務 B' : 'Test Service B',
          quantity: 1,
          unitPrice: 5000,
          discount: 0,
          subtotal: 5000,
        },
      ],
      subtotal: 6900,
      taxRate: 5,
      taxAmount: 345,
      totalAmount: 7245,
      notes: locale === 'zh'
        ? '這是測試備註。\n請忽略此測試郵件。'
        : 'This is a test note.\nPlease ignore this test email.',
    },
    senderInfo: {
      companyName: locale === 'zh' ? '測試公司' : 'Test Company',
      senderName: locale === 'zh' ? '業務部' : 'Sales Department',
      senderEmail: 'sales@example.com',
    },
    urls: {
      viewUrl: 'https://example.com/quotations/test',
      downloadUrl: 'https://example.com/api/quotations/test/pdf',
    },
  }

  return sendQuotationEmail(testData)
}