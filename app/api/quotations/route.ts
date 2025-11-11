import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import {
  getQuotations,
  createQuotation,
  createQuotationItem,
  generateQuotationNumber,
  validateCustomerOwnership
} from '@/lib/dal/quotations'
import { getCustomerById } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'


/**
 * GET /api/quotations - 取得所有報價單
 */
export async function GET(
  request: NextRequest,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得報價單資料
    const quotations = await getQuotations(db, user.id)

    // 載入客戶名稱（D1 不支援 JOIN，需要手動查詢）
    const formattedQuotations = await Promise.all(
      quotations.map(async (q) => {
        const customer = await getCustomerById(db, user.id, q.customer_id)
        return {
          ...q,
          customer_name: customer?.name || null
        }
      })
    )

    return NextResponse.json(formattedQuotations)
  } catch (error: unknown) {
    console.error('Error fetching quotations:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/quotations - 建立新報價單
 */
export async function POST(
  request: NextRequest,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json()
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

    // 生成報價單號碼
    const quotationNumber = await generateQuotationNumber(db, user.id)

    // 建立報價單
    const quotation = await createQuotation(db, user.id, {
      customer_id,
      quotation_number: quotationNumber,
      status: 'draft',
      issue_date,
      valid_until,
      currency,
      subtotal: parseFloat(subtotal),
      tax_rate: parseFloat(tax_rate),
      tax_amount: parseFloat(tax_amount),
      total_amount: parseFloat(total_amount),
      notes: notes || null
    })

    // 建立報價單項目
    if (items && items.length > 0) {
      for (const item of items) {
        await createQuotationItem(db, {
          quotation_id: quotation.id,
          product_id: item.product_id || null,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          discount: parseFloat(item.discount || 0),
          subtotal: parseFloat(item.subtotal)
        })
      }
    }

    return NextResponse.json(quotation, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating quotation:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
