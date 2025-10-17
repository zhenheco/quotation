/**
 * 報價單 PDF 生成 API
 * GET /api/quotations/[id]/pdf?locale=zh&both=false
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { QuotationPDFTemplate } from '@/lib/pdf/QuotationPDFTemplate'
import { QuotationPDFData } from '@/lib/pdf/types'
import {
  getQuotationById,
  getQuotationItems,
  getCustomerById,
  getProducts,
} from '@/lib/services/database'
import { getZeaburPool } from '@/lib/db/zeabur'

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
    const supabase = await createClient()

    // 檢查用戶是否已登入
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 使用 Zeabur PostgreSQL 獲取報價單資料
    const quotation = await getQuotationById(id, user.id)

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // 獲取客戶資訊
    const customer = await getCustomerById(quotation.customer_id, user.id)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // 獲取報價單項目和產品資訊
    const quotationItems = await getQuotationItems(quotation.id, user.id)

    // 為每個項目獲取產品資訊
    const pool = getZeaburPool()
    const items = await Promise.all(
      quotationItems.map(async (item) => {
        if (!item.product_id) return item
        const result = await pool.query(
          'SELECT id, name, description FROM products WHERE id = $1',
          [item.product_id]
        )
        return {
          ...item,
          products: result.rows[0] || null
        }
      })
    )

    // 構建 PDF 資料
    const pdfData: QuotationPDFData = {
      quotation: {
        id: quotation.id,
        quotation_number: quotation.quotation_number,
        issue_date: quotation.issue_date,
        valid_until: quotation.valid_until,
        status: quotation.status,
        currency: quotation.currency,
        exchange_rate: null,
        subtotal: quotation.subtotal,
        tax_rate: quotation.tax_rate,
        tax_amount: quotation.tax_amount,
        total_amount: quotation.total_amount,
        notes: typeof quotation.notes === 'string'
          ? { zh: quotation.notes, en: quotation.notes }
          : (quotation.notes as { zh: string; en: string } | null),
      },
      customer: {
        name: customer.name as { zh: string; en: string },
        email: customer.email,
        phone: customer.phone || null,
        address: customer.address as { zh: string; en: string } | null,
      },
      items: items.map((item) => ({
        id: item.id,
        product: {
          name: item.products?.name as { zh: string; en: string } || { zh: '未知產品', en: 'Unknown Product' },
          description: item.products?.description as { zh: string; en: string } | null || null,
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
