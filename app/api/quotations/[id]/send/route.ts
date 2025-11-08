import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuotationById, updateQuotation } from '@/lib/services/database'
import { emailService } from '@/lib/services/email'
import { generateQuotationEmailHTML, generateDefaultEmailSubject } from '@/lib/templates/quotation-email'
import { getErrorMessage } from '@/app/api/utils/error-handler'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subject, content, locale = 'zh' } = body

    const quotation = await getQuotationById(id, user.id)

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found', code: 'QUOTATION_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (!quotation.customer_email) {
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

    const emailHTML = content || generateQuotationEmailHTML({
      locale: locale as 'zh' | 'en',
      quotationNumber: quotation.quotation_number,
      customerName: locale === 'zh' ? quotation.customer_name?.zh || '' : quotation.customer_name?.en || '',
      issueDate: new Date(quotation.issue_date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US'),
      validUntil: new Date(quotation.valid_until).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US'),
      currency: quotation.currency,
      total: quotation.total,
      viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${locale}/quotations/${quotation.id}`,
      companyName: process.env.COMPANY_NAME || 'Company',
    })

    const emailResult = await emailService.sendEmail({
      to: quotation.customer_email,
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
      id,
      user.id,
      { status: 'sent' as const }
    )

    return NextResponse.json({
      success: true,
      message: 'Quotation sent successfully',
      data: {
        id: updatedQuotation.id,
        quotation_number: updatedQuotation.quotation_number,
        status: updatedQuotation.status,
        customer_email: quotation.customer_email,
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
