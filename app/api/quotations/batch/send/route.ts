import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuotationById, updateQuotation } from '@/lib/services/database'
import { emailService } from '@/lib/services/email'
import { generateQuotationEmailHTML, generateDefaultEmailSubject } from '@/lib/templates/quotation-email'
import { getErrorMessage } from '@/app/api/utils/error-handler'

const MAX_BATCH_SIZE = 50

interface BatchSendResult {
  id: string
  quotation_number: string
  status: 'success' | 'failed'
  error?: string
  sent_at?: string
}

export async function POST(request: NextRequest) {
  try {
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
    const { ids, subject, content, locale = 'zh' } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No quotation IDs provided' },
        { status: 400 }
      )
    }

    if (ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch size exceeds maximum limit of ${MAX_BATCH_SIZE}`,
          code: 'BATCH_SIZE_EXCEEDED',
        },
        { status: 400 }
      )
    }

    const results: BatchSendResult[] = []
    let sentCount = 0
    let failedCount = 0

    for (const id of ids) {
      try {
        const quotation = await getQuotationById(id, user.id)

        if (!quotation) {
          results.push({
            id,
            quotation_number: 'Unknown',
            status: 'failed',
            error: 'Quotation not found',
          })
          failedCount++
          continue
        }

        if (!quotation.customer_email) {
          results.push({
            id,
            quotation_number: quotation.quotation_number,
            status: 'failed',
            error: 'Customer does not have an email address',
          })
          failedCount++
          continue
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
          downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/quotations/${quotation.id}/pdf`,
          companyName: process.env.COMPANY_NAME || 'Company',
        })

        const emailResult = await emailService.sendEmail({
          to: quotation.customer_email,
          subject: emailSubject,
          html: emailHTML,
        })

        if (!emailResult.success) {
          results.push({
            id,
            quotation_number: quotation.quotation_number,
            status: 'failed',
            error: emailResult.error,
          })
          failedCount++
          continue
        }

        await updateQuotation(
          id,
          user.id,
          { status: 'sent' as const }
        )

        const sentAt = new Date().toISOString()
        results.push({
          id,
          quotation_number: quotation.quotation_number,
          status: 'success',
          sent_at: sentAt,
        })
        sentCount++
      } catch (error: unknown) {
        console.error(`Error sending quotation ${id}:`, error)
        results.push({
          id,
          quotation_number: 'Unknown',
          status: 'failed',
          error: getErrorMessage(error) || 'Unknown error',
        })
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Batch send completed',
      data: {
        total: ids.length,
        sent: sentCount,
        failed: failedCount,
        results,
      },
    })
  } catch (error: unknown) {
    console.error('Batch send quotations error:', error)
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'Failed to send quotations',
      },
      { status: 500 }
    )
  }
}
