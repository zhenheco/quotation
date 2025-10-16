/**
 * Email 測試 API
 * GET /api/test-email - 測試 Email 連線
 * POST /api/test-email - 發送測試 Email
 */

import { NextRequest, NextResponse } from 'next/server'
import { testEmailConnection, sendQuotationEmail } from '@/lib/email/service-gmail'

// GET - 測試連線
export async function GET() {
  try {
    const result = await testEmailConnection()

    return NextResponse.json({
      success: result.success,
      message: result.message,
      config: {
        gmail: {
          configured: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
          user: process.env.GMAIL_USER ? process.env.GMAIL_USER.replace(/(.{3}).*@/, '$1***@') : 'Not configured'
        },
        resend: {
          configured: !!process.env.RESEND_API_KEY,
          from: process.env.EMAIL_FROM || 'Not configured'
        },
        company: process.env.COMPANY_NAME || 'Not configured'
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Connection test failed'
      },
      { status: 500 }
    )
  }
}

// POST - 發送測試 Email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, locale = 'zh' } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      )
    }

    // 準備測試數據
    const testData = {
      to,
      locale: locale as 'zh' | 'en',
      quotationData: {
        recipientName: locale === 'zh' ? '測試客戶' : 'Test Customer',
        recipientEmail: to,
        quotationNumber: 'TEST-2025-001',
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
            subtotal: 1900
          },
          {
            name: locale === 'zh' ? '測試服務 B' : 'Test Service B',
            description: locale === 'zh' ? '專業服務項目' : 'Professional service item',
            quantity: 1,
            unitPrice: 5000,
            discount: 0,
            subtotal: 5000
          }
        ],
        subtotal: 6900,
        taxRate: 5,
        taxAmount: 345,
        totalAmount: 7245,
        notes: locale === 'zh'
          ? '這是一封測試報價單 Email，用於驗證系統發送功能是否正常。'
          : 'This is a test quotation email to verify that the system sending function is working properly.'
      },
      senderInfo: {
        companyName: process.env.COMPANY_NAME || 'Test Company',
        senderName: locale === 'zh' ? '系統管理員' : 'System Administrator',
        senderEmail: process.env.GMAIL_USER || process.env.EMAIL_FROM || 'test@example.com'
      },
      urls: {
        viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${locale}/quotations/test`,
        downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/quotations/test/pdf`
      }
    }

    // 發送測試 Email
    const result = await sendQuotationEmail(testData)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${to}`,
        provider: result.provider,
        messageId: result.messageId
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          provider: result.provider
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send test email'
      },
      { status: 500 }
    )
  }
}