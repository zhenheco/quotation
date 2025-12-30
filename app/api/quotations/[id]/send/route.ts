import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getQuotationById, updateQuotation } from '@/lib/dal/quotations'
import { getCustomerById } from '@/lib/dal/customers'
import { emailService } from '@/lib/services/email'
import { generateQuotationEmailHTML, generateDefaultEmailSubject } from '@/lib/templates/quotation-email'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'

interface SendQuotationBody {
  subject?: string;
  content?: string;
  locale?: 'zh' | 'en';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = createApiClient(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = getSupabaseClient()
    const kv = getKVCache()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to send quotations' },
        { status: 403 }
      )
    }

    const body = await request.json() as SendQuotationBody
    const { subject, content, locale = 'zh' } = body

    const quotation = await getQuotationById(db, user.id, id)

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found', code: 'QUOTATION_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 查詢客戶資料
    const customer = await getCustomerById(db, user.id, quotation.customer_id)

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (!customer.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer does not have an email address',
          code: 'MISSING_CUSTOMER_EMAIL',
        },
        { status: 400 }
      )
    }

    const emailSubject = subject || generateDefaultEmailSubject(quotation.quotation_number, locale as 'zh' | 'en')

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'NEXT_PUBLIC_APP_URL environment variable is not configured',
          code: 'MISSING_APP_URL',
        },
        { status: 500 }
      )
    }

    const emailHTML = content || generateQuotationEmailHTML({
      locale: locale as 'zh' | 'en',
      quotationNumber: quotation.quotation_number,
      customerName: locale === 'zh' ? customer.name.zh : customer.name.en,
      issueDate: new Date(quotation.issue_date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US'),
      validUntil: new Date(quotation.valid_until).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US'),
      currency: quotation.currency,
      total: quotation.total_amount,
      viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/quotations/${quotation.id}`,
      companyName: process.env.COMPANY_NAME || '',
    })

    const emailResult = await emailService.sendEmail({
      to: customer.email,
      subject: emailSubject,
      html: emailHTML,
    })

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to send email: ${emailResult.error}`,
          code: 'EMAIL_SEND_FAILED',
        },
        { status: 500 }
      )
    }

    const updatedQuotation = await updateQuotation(
      db,
      user.id,
      id,
      { status: 'sent' as const }
    )

    return NextResponse.json({
      success: true,
      message: 'Quotation sent successfully',
      data: {
        id: updatedQuotation.id,
        quotation_number: updatedQuotation.quotation_number,
        status: updatedQuotation.status,
        customer_email: customer.email,
      },
    })
  } catch (error: unknown) {
    console.error('Send quotation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'Failed to send quotation',
      },
      { status: 500 }
    )
  }
}
