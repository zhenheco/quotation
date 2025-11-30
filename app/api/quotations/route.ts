import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import {
  getQuotations,
  createQuotationItem,
  createQuotationWithRetry,
  validateCustomerOwnership
} from '@/lib/dal/quotations'
import { getCustomersByIds } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
// Note: Edge runtime removed for OpenNext compatibility;


/**
 * GET /api/quotations - 取得所有報價單
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext()

  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得報價單資料
    const quotations = await getQuotations(db, user.id)

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

    return NextResponse.json(formattedQuotations)
  } catch (error: unknown) {
    console.error('Error fetching quotations:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/quotations - 建立新報價單
 */
export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext()

  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    interface QuotationItemInput {
      product_id?: string | null;
      description: { zh: string; en: string };
      quantity: string | number;
      unit_price: string | number;
      discount?: string | number;
      subtotal: string | number;
    }

    interface CreateQuotationBody {
      customer_id: string;
      issue_date: string;
      valid_until: string;
      currency: string;
      subtotal: string | number;
      tax_rate: string | number;
      tax_amount: string | number;
      total_amount: string | number;
      notes?: { zh: string; en: string };
      terms?: { zh: string; en: string };
      items: QuotationItemInput[];
    }

    const body = await request.json() as CreateQuotationBody
    const {
      customer_id,
      issue_date,
      valid_until,
      currency,
      subtotal,
      tax_rate,
      tax_amount,
      total_amount,
      notes,
      terms,
      items
    } = body

    // 驗證必填欄位
    if (!customer_id || !issue_date || !valid_until || !currency || !items || items.length === 0) {
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

    const quotation = await createQuotationWithRetry(db, user.id, {
      customer_id,
      status: 'draft',
      issue_date,
      valid_until,
      currency,
      subtotal: parseFloat(String(subtotal)),
      tax_rate: parseFloat(String(tax_rate)),
      tax_amount: parseFloat(String(tax_amount)),
      total_amount: parseFloat(String(total_amount)),
      notes,
      terms
    })

    // 建立報價單項目
    if (items && items.length > 0) {
      for (const item of items) {
        await createQuotationItem(db, {
          quotation_id: quotation.id,
          product_id: item.product_id || null,
          description: item.description,
          quantity: parseFloat(String(item.quantity)),
          unit_price: parseFloat(String(item.unit_price)),
          discount: parseFloat(String(item.discount || 0)),
          subtotal: parseFloat(String(item.subtotal))
        })
      }
    }

    return NextResponse.json(quotation, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating quotation:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
