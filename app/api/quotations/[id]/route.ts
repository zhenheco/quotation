import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
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
import { syncQuotationToPaymentSchedules } from '@/lib/dal/payments'
import { getCustomerByIdOnly } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'
import { isValidUUID } from '@/lib/security'


/**
 * GET /api/quotations/[id] - 取得單一報價單
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 安全：驗證 UUID 格式
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid quotation ID format' }, { status: 400 })
    }

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得報價單資料
    const quotation = await getQuotationById(db, user.id, id)

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // 載入客戶名稱（使用不限制 user_id 的查詢，支援同公司跨用戶查看）
    // 安全驗證：確保 customer 屬於同一公司
    const customer = await getCustomerByIdOnly(db, quotation.customer_id)
    const customerName = (customer && customer.company_id === quotation.company_id)
      ? customer.name
      : null

    // 載入報價單項目
    const items = await getQuotationItems(db, id)

    return NextResponse.json({
      ...quotation,
      customer_name: customerName,
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
  try {
    const { id } = await params

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    interface QuotationItemInput {
      product_id?: string | null;
      description: { zh: string; en: string };
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
      show_tax?: boolean;
      discount_amount?: string | number;
      discount_description?: string | null;
      notes?: { zh: string; en: string };
      payment_method?: string;
      payment_notes?: string;
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
      show_tax,
      discount_amount,
      discount_description,
      notes,
      payment_method,
      payment_notes,
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
    if (show_tax !== undefined) updateData.show_tax = show_tax
    if (discount_amount !== undefined) updateData.discount_amount = typeof discount_amount === 'string' ? parseFloat(discount_amount) : discount_amount
    if (discount_description !== undefined) updateData.discount_description = discount_description
    if (notes !== undefined) updateData.notes = notes
    if (payment_method !== undefined) updateData.payment_method = payment_method
    if (payment_notes !== undefined) updateData.payment_notes = payment_notes

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
          description: item.description,
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
  try {
    const { id } = await params

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    interface PatchQuotationBody {
      status: 'draft' | 'sent' | 'accepted' | 'expired';
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

    // 當狀態變更為 sent 或 accepted 時，自動同步付款條款到收款排程
    if (status === 'sent' || status === 'accepted') {
      try {
        const syncResult = await syncQuotationToPaymentSchedules(db, user.id, id)
        return NextResponse.json({
          ...quotation,
          payment_sync: {
            created: syncResult.created,
            updated: syncResult.updated,
          }
        })
      } catch (syncError) {
        console.error('Error syncing payment schedules:', syncError)
        // 同步失敗不影響狀態更新的成功回應
      }
    }

    return NextResponse.json(quotation)
  } catch (error: unknown) {
    console.error('Error updating quotation status:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/quotations/[id] - 刪除報價單
 * 支援 forceDelete 參數，可連同刪除關聯的付款紀錄
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 解析 request body 取得 forceDelete 參數
    let forceDelete = false
    try {
      const body = await request.json()
      forceDelete = body?.forceDelete === true
    } catch {
      // 沒有 body 或解析失敗，使用預設值 false
    }

    // 如果 forceDelete，先刪除關聯的付款紀錄
    if (forceDelete) {
      // 刪除關聯的 payments
      const { error: paymentsError } = await db
        .from('payments')
        .delete()
        .eq('quotation_id', id)

      if (paymentsError) {
        console.error('Error deleting related payments:', paymentsError)
        return NextResponse.json({
          error: '刪除關聯付款紀錄失敗'
        }, { status: 500 })
      }

      // 刪除關聯的 payment_schedules
      const { error: schedulesError } = await db
        .from('payment_schedules')
        .delete()
        .eq('quotation_id', id)

      if (schedulesError) {
        console.error('Error deleting related payment schedules:', schedulesError)
        return NextResponse.json({
          error: '刪除關聯付款排程失敗'
        }, { status: 500 })
      }
    }

    // 刪除報價單項目
    const items = await getQuotationItems(db, id)
    for (const item of items) {
      await deleteQuotationItem(db, item.id)
    }

    // 刪除報價單
    try {
      await deleteQuotation(db, user.id, id)
    } catch (deleteError: unknown) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError)

      // 檢測外鍵約束錯誤，提供友善訊息
      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('23503')) {
        if (errorMessage.includes('payments')) {
          return NextResponse.json({
            error: '無法刪除此報價單，因為已有相關的付款紀錄。請勾選「連同刪除關聯付款紀錄」後再試。',
            code: 'HAS_RELATED_PAYMENTS'
          }, { status: 400 })
        }
        return NextResponse.json({
          error: '無法刪除此報價單，因為有其他資料正在使用此紀錄。',
          code: 'HAS_RELATED_RECORDS'
        }, { status: 400 })
      }
      throw deleteError
    }

    return NextResponse.json({ message: 'Quotation deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting quotation:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
