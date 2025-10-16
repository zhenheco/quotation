import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// 使用支援 Gmail 的新版 service
import { sendQuotationEmail } from '@/lib/email/service-gmail'
import { emailRateLimiter } from '@/lib/middleware/rate-limiter'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 套用速率限制
  return emailRateLimiter(request, async () => {
    try {
    const supabase = await createClient()

    // 驗證用戶
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 獲取請求數據
    const body = await request.json()
    const { recipientEmail, locale = 'zh', ccEmails = [] } = body

    // Email 格式驗證函數
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    // 驗證收件人 Email
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      return NextResponse.json(
        { error: 'Valid recipient email is required' },
        { status: 400 }
      )
    }

    // 驗證 CC Email
    const invalidCcEmails = ccEmails.filter((email: string) => !isValidEmail(email))
    if (invalidCcEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid CC emails: ${invalidCcEmails.join(', ')}` },
        { status: 400 }
      )
    }

    // 限制 CC 數量防止濫用
    if (ccEmails.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 CC recipients allowed' },
        { status: 400 }
      )
    }

    // 獲取報價單詳細資訊
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone,
          address
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (quotationError || !quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      )
    }

    // 獲取報價單項目
    const { data: items, error: itemsError } = await supabase
      .from('quotation_items')
      .select(`
        *,
        products (
          name,
          description
        )
      `)
      .eq('quotation_id', params.id)
      .order('created_at')

    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch quotation items' },
        { status: 500 }
      )
    }

    // 準備 Email 數據
    const emailData = {
      to: recipientEmail,
      locale: locale as 'zh' | 'en',
      quotationData: {
        recipientName: quotation.customers?.name[locale] || quotation.customers?.name.zh || 'Customer',
        recipientEmail: recipientEmail,
        quotationNumber: quotation.quotation_number,
        issueDate: new Date(quotation.issue_date).toLocaleDateString(
          locale === 'zh' ? 'zh-TW' : 'en-US'
        ),
        validUntil: new Date(quotation.valid_until).toLocaleDateString(
          locale === 'zh' ? 'zh-TW' : 'en-US'
        ),
        currency: quotation.currency,
        items: items?.map(item => ({
          name: item.products?.name[locale] || item.products?.name.zh || 'Product',
          description: item.products?.description?.[locale] || item.products?.description?.zh,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount,
          subtotal: item.subtotal,
        })) || [],
        subtotal: quotation.subtotal,
        taxRate: quotation.tax_rate,
        taxAmount: quotation.tax_amount,
        totalAmount: quotation.total_amount,
        notes: quotation.notes,
      },
      senderInfo: {
        companyName: process.env.COMPANY_NAME || 'Your Company',
        senderName: user.user_metadata?.full_name || 'Sales Team',
        senderEmail: user.email || 'noreply@example.com',
      },
      urls: {
        viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${locale}/quotations/${params.id}`,
        downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/quotations/${params.id}/pdf?locale=${locale}`,
      },
    }

    // 發送主要郵件
    const result = await sendQuotationEmail(emailData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    // 發送副本郵件（如果有）
    const ccResults = []
    for (const ccEmail of ccEmails) {
      const ccResult = await sendQuotationEmail({
        ...emailData,
        to: ccEmail,
      })
      ccResults.push({ email: ccEmail, success: ccResult.success })
    }

    // 更新報價單狀態為「已發送」
    if (quotation.status === 'draft') {
      await supabase
        .from('quotations')
        .update({ status: 'sent' })
        .eq('id', params.id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        mainRecipient: recipientEmail,
        ccRecipients: ccResults,
      },
    })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  })
}