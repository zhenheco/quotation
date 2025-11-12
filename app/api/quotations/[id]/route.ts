import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import {
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  getQuotationItems,
  createQuotationItem,
  deleteQuotationItem,
  validateCustomerOwnership
} from '@/lib/dal/quotations'
import { getCustomerById } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'


/**
 * GET /api/quotations/[id] - 取得單一報價單
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

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
    const quotation = await getQuotationById(db, user.id, id)

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // 載入客戶名稱
    const customer = await getCustomerById(db, user.id, quotation.customer_id)

    // 載入報價單項目
    const items = await getQuotationItems(db, id)

    return NextResponse.json({
      ...quotation,
      customer_name: customer?.name || null,
      items
    })
  } catch (error: unknown) {
    console.error('Error fetching quotation:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * PUT /api/quotations/[id] - 更新報價單
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

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

    interface QuotationItemInput {
      product_id?: string | null;
      quantity: string | number;
      unit_price: string | number;
      discount?: string | number;
      subtotal: string | number;
    }

    interface UpdateQuotationBody {
      customer_id?: string;
      status?: string;
      issue_date?: string;
      valid_until?: string;
      currency?: string;
      subtotal?: string | number;
      tax_rate?: string | number;
      tax_amount?: string | number;
      total_amount?: string | number;
      notes?: string;
      items?: QuotationItemInput[];
    }

    const body = await request.json() as UpdateQuotationBody
    const {
      customer_id,
      status,
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

    // 驗證報價單是否存在
    const existingQuotation = await getQuotationById(db, user.id, id)
    if (!existingQuotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // 驗證客戶所有權（如有提供）
    if (customer_id) {
      const isValidCustomer = await validateCustomerOwnership(db, customer_id, user.id)
      if (!isValidCustomer) {
        return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (customer_id !== undefined) updateData.customer_id = customer_id
    if (status !== undefined) updateData.status = status
    if (issue_date !== undefined) updateData.issue_date = issue_date
    if (valid_until !== undefined) updateData.valid_until = valid_until
    if (currency !== undefined) updateData.currency = currency
    if (subtotal !== undefined) updateData.subtotal = typeof subtotal === 'string' ? parseFloat(subtotal) : subtotal
    if (tax_rate !== undefined) updateData.tax_rate = typeof tax_rate === 'string' ? parseFloat(tax_rate) : tax_rate
    if (tax_amount !== undefined) updateData.tax_amount = typeof tax_amount === 'string' ? parseFloat(tax_amount) : tax_amount
    if (total_amount !== undefined) updateData.total_amount = typeof total_amount === 'string' ? parseFloat(total_amount) : total_amount
    if (notes !== undefined) updateData.notes = notes

    // 更新報價單
    const quotation = await updateQuotation(db, user.id, id, updateData)

    // 如果提供了項目，則刪除舊的並重新插入
    if (items && Array.isArray(items)) {
      // 刪除舊項目
      const oldItems = await getQuotationItems(db, id)
      for (const oldItem of oldItems) {
        await deleteQuotationItem(db, oldItem.id)
      }

      // 插入新項目
      for (const item of items) {
        await createQuotationItem(db, {
          quotation_id: id,
          product_id: item.product_id || null,
          quantity: parseFloat(String(item.quantity)),
          unit_price: parseFloat(String(item.unit_price)),
          discount: parseFloat(String(item.discount || 0)),
          subtotal: parseFloat(String(item.subtotal))
        })
      }
    }

    return NextResponse.json(quotation)
  } catch (error: unknown) {
    console.error('Error updating quotation:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * PATCH /api/quotations/[id] - 部分更新報價單（用於狀態更新）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

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
    interface PatchQuotationBody {
      status: 'draft' | 'sent' | 'accepted' | 'rejected';
    }
    const body = await request.json() as PatchQuotationBody
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // 驗證報價單是否存在
    const existingQuotation = await getQuotationById(db, user.id, id)
    if (!existingQuotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // 更新報價單狀態
    const quotation = await updateQuotation(db, user.id, id, { status })

    return NextResponse.json(quotation)
  } catch (error: unknown) {
    console.error('Error updating quotation status:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/quotations/[id] - 刪除報價單
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 先刪除報價單項目
    const items = await getQuotationItems(db, id)
    for (const item of items) {
      await deleteQuotationItem(db, item.id)
    }

    // 刪除報價單
    await deleteQuotation(db, user.id, id)

    return NextResponse.json({ message: 'Quotation deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting quotation:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
