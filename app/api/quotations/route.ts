import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import {
  getQuotations,
  getQuotationsPaginated,
  createQuotationItemsBatch,
  createQuotationWithRetry,
  validateCustomerOwnership
} from '@/lib/dal/quotations'
import { getCustomersByIds } from '@/lib/dal/customers'

/**
 * GET /api/quotations - 取得報價單列表
 *
 * 查詢參數：
 * - page: 頁碼（預設 1）
 * - limit: 每頁筆數（預設 20，最大 100）
 * - status: 篩選狀態
 * - paginated: 是否使用分頁（預設 false，向後相容）
 */
export const GET = withAuth('quotations:read')(async (request, { user, db }) => {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const status = searchParams.get('status') as 'draft' | 'sent' | 'accepted' | 'expired' | null
  const usePagination = searchParams.get('paginated') === 'true'

  // 根據是否啟用分頁選擇不同的查詢方式
  if (usePagination) {
    // 分頁模式
    const result = await getQuotationsPaginated(db, user.id, {
      page,
      limit,
      status: status || undefined
    })

    // 批量載入客戶資料
    const customerIds = result.data.map(q => q.customer_id).filter(Boolean)
    const customersMap = await getCustomersByIds(db, user.id, customerIds)

    const formattedData = result.data.map(q => {
      const customer = customersMap.get(q.customer_id)
      return {
        ...q,
        customer_name: customer?.name || null,
        customer_email: customer?.email || null
      }
    })

    const response = NextResponse.json({
      data: formattedData,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    return response
  }

  // 非分頁模式（向後相容）
  const quotations = await getQuotations(db, user.id, {
    status: status || undefined
  })

  // 批量載入客戶名稱和 Email（解決 N+1 查詢問題）
  const customerIds = quotations.map(q => q.customer_id).filter(Boolean)
  const customersMap = await getCustomersByIds(db, user.id, customerIds)

  // 合併客戶資料
  const formattedQuotations = quotations.map(q => {
    const customer = customersMap.get(q.customer_id)
    return {
      ...q,
      customer_name: customer?.name || null,
      customer_email: customer?.email || null
    }
  })

  // 設定快取：報價單資料較敏感，快取 30 秒
  const response = NextResponse.json(formattedQuotations)
  response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
  return response
})

/**
 * POST /api/quotations - 建立新報價單
 */
export const POST = withAuth('quotations:write')(async (request, { user, db }) => {
  // 請求資料類型
  interface QuotationItemInput {
    product_id?: string | null
    description: { zh: string; en: string }
    quantity: string | number
    unit_price: string | number
    discount?: string | number
    subtotal: string | number
  }

  interface CreateQuotationBody {
    company_id: string
    customer_id: string
    issue_date: string
    valid_until: string
    currency: string
    subtotal: string | number
    tax_rate: string | number
    tax_amount: string | number
    total_amount: string | number
    show_tax?: boolean
    discount_amount?: string | number
    discount_description?: string | null
    notes?: { zh: string; en: string }
    terms?: { zh: string; en: string }
    items: QuotationItemInput[]
  }

  const body = await request.json() as CreateQuotationBody
  const {
    company_id,
    customer_id,
    issue_date,
    valid_until,
    currency,
    subtotal,
    tax_rate,
    tax_amount,
    total_amount,
    show_tax,
    discount_amount,
    discount_description,
    notes,
    terms,
    items
  } = body

  // 驗證必填欄位
  if (!company_id || !customer_id || !issue_date || !valid_until || !currency || !items || items.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 驗證客戶所有權
  const isValidCustomer = await validateCustomerOwnership(db, customer_id, user.id)
  if (!isValidCustomer) {
    return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })
  }

  // 建立報價單（使用帶重試機制的函數防止編號重複）
  console.log('[API] POST /api/quotations - notes type:', typeof notes, notes)
  console.log('[API] POST /api/quotations - items:', JSON.stringify(items, null, 2))

  const quotation = await createQuotationWithRetry(db, user.id, company_id, {
    customer_id,
    status: 'draft',
    issue_date,
    valid_until,
    currency,
    subtotal: parseFloat(String(subtotal)),
    tax_rate: parseFloat(String(tax_rate)),
    tax_amount: parseFloat(String(tax_amount)),
    total_amount: parseFloat(String(total_amount)),
    show_tax: show_tax !== false,
    discount_amount: discount_amount ? parseFloat(String(discount_amount)) : 0,
    discount_description: discount_description || null,
    notes,
    terms
  })

  // 批次建立報價單項目（效能優化：單次 INSERT）
  if (items && items.length > 0) {
    const parsedItems = items.map((item, index) => ({
      product_id: item.product_id || null,
      description: item.description,
      quantity: parseFloat(String(item.quantity)),
      unit_price: parseFloat(String(item.unit_price)),
      discount: parseFloat(String(item.discount || 0)),
      subtotal: parseFloat(String(item.subtotal)),
      sort_order: index
    }))
    await createQuotationItemsBatch(db, quotation.id, parsedItems)
  }

  return NextResponse.json(quotation, { status: 201 })
})
