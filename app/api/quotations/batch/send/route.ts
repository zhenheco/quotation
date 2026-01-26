import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
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

    // 批次查詢所有報價單
    const { data: quotations, error: quotationError } = await db
      .from('quotations')
      .select('*')
      .in('id', ids)
      .eq('user_id', user.id)

    if (quotationError) {
      console.error('Error fetching quotations:', quotationError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch quotations' },
        { status: 500 }
      )
    }

    const quotationMap = new Map(quotations?.map(q => [q.id, q]) || [])
    const customerIds = [...new Set(quotations?.map(q => q.customer_id).filter(Boolean) || [])]

    // 批次查詢所有相關客戶
    const { data: customers, error: customerError } = customerIds.length > 0
      ? await db
          .from('customers')
          .select('*')
          .in('id', customerIds)
      : { data: [], error: null }

    if (customerError) {
      console.error('Error fetching customers:', customerError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customers' },
        { status: 500 }
      )
    }

    const customerMap = new Map(customers?.map(c => [c.id, c]) || [])

    const results: BatchSendResult[] = []
    let sentCount = 0
    let failedCount = 0
    const successfulIds: string[] = []

    // 處理每個報價單
    for (const id of ids) {
      try {
        const quotation = quotationMap.get(id)

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

        const customer = customerMap.get(quotation.customer_id)

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

        const emailSubject = subject || generateDefaultEmailSubject(quotation.quotation_number, locale)

        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        if (!appUrl) {
          results.push({
            id,
            quotation_number: quotation.quotation_number,
            status: 'failed',
            error: 'NEXT_PUBLIC_APP_URL environment variable is not configured',
          })
          failedCount++
          continue
        }

        const localeCode = locale === 'zh' ? 'zh-TW' : 'en-US'
        const emailHTML = content || generateQuotationEmailHTML({
          locale,
          quotationNumber: quotation.quotation_number,
          customerName: locale === 'zh' ? customer.name.zh : customer.name.en,
          issueDate: new Date(quotation.issue_date).toLocaleDateString(localeCode),
          validUntil: new Date(quotation.valid_until).toLocaleDateString(localeCode),
          currency: quotation.currency,
          total: quotation.total_amount,
          viewUrl: `${appUrl}/${locale}/quotations/${quotation.id}`,
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

        successfulIds.push(id)
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

    // 批次更新成功發送的報價單狀態
    if (successfulIds.length > 0) {
      const { error: updateError } = await db
        .from('quotations')
        .update({
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .in('id', successfulIds)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating quotation statuses:', updateError)
        // 注意：郵件已發送但狀態更新失敗，記錄但不影響回應
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
