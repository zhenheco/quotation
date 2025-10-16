/**
 * 報價單 PDF 生成 API
 * GET /api/quotations/[id]/pdf?locale=zh&both=false
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { createServerClient } from '@/lib/supabase/server'
import { QuotationPDFTemplate } from '@/lib/pdf/QuotationPDFTemplate'
import { QuotationPDFData } from '@/lib/pdf/types'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const locale = (searchParams.get('locale') || 'zh') as 'zh' | 'en'
    const showBothLanguages = searchParams.get('both') === 'true'

    // 建立 Supabase 客戶端
    const supabase = await createServerClient()

    // 檢查用戶是否已登入
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 獲取報價單資料
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(
        `
        *,
        customers (
          id,
          name,
          email,
          phone,
          address
        )
      `
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (quotationError || !quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // 獲取報價單項目
    const { data: items, error: itemsError } = await supabase
      .from('quotation_items')
      .select(
        `
        *,
        products (
          id,
          name,
          description
        )
      `
      )
      .eq('quotation_id', id)
      .order('created_at', { ascending: true })

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    // 構建 PDF 資料
    const pdfData: QuotationPDFData = {
      quotation: {
        id: quotation.id,
        quotation_number: quotation.quotation_number,
        issue_date: quotation.issue_date,
        valid_until: quotation.valid_until,
        status: quotation.status,
        currency: quotation.currency,
        exchange_rate: quotation.exchange_rate,
        subtotal: quotation.subtotal,
        tax_rate: quotation.tax_rate,
        tax_amount: quotation.tax_amount,
        total_amount: quotation.total_amount,
        notes: quotation.notes as { zh: string; en: string } | null,
      },
      customer: {
        name: quotation.customers.name as { zh: string; en: string },
        email: quotation.customers.email,
        phone: quotation.customers.phone,
        address: quotation.customers.address as { zh: string; en: string } | null,
      },
      items: (items || []).map((item) => ({
        id: item.id,
        product: {
          name: item.products.name as { zh: string; en: string },
          description: item.products.description as { zh: string; en: string } | null,
        },
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        subtotal: item.subtotal,
      })),
    }

    // 生成 PDF
    const stream = await renderToStream(
      <QuotationPDFTemplate
        data={pdfData}
        locale={locale}
        showBothLanguages={showBothLanguages}
      />
    )

    // 設定檔案名稱
    const filename = `quotation-${quotation.quotation_number}-${locale}${showBothLanguages ? '-bilingual' : ''}.pdf`

    // 返回 PDF 串流
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
