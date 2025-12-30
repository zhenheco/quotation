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

const MAX_BATCH_SIZE = 50

interface BatchSendResult {
  id: string
  quotation_number: string
  status: 'success' | 'failed'
  error?: string
  sent_at?: string
}

interface BatchSendBody {
  ids: string[];
  subject?: string;
  content?: string;
  locale?: 'zh' | 'en';
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json() as BatchSendBody
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
        const quotation = await getQuotationById(db, user.id, id)

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

        // 查詢客戶資料
        const customer = await getCustomerById(db, user.id, quotation.customer_id)

        if (!customer) {
          results.push({
            id,
            quotation_number: quotation.quotation_number,
            status: 'failed',
            error: 'Customer not found',
          })
          failedCount++
          continue
        }

        if (!customer.email) {
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

        if (!process.env.NEXT_PUBLIC_APP_URL) {
          results.push({
            id,
            quotation_number: quotation.quotation_number,
            status: 'failed',
            error: 'NEXT_PUBLIC_APP_URL environment variable is not configured',
          })
          failedCount++
          continue
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
          db,
          user.id,
          id,
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
