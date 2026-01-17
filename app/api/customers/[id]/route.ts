import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCustomerById, updateCustomer, deleteCustomer } from '@/lib/dal/customers'
import { UpdateCustomerRequest } from '@/app/api/types'
import { validateFields, CUSTOMER_ALLOWED_FIELDS } from '@/lib/security/field-validator'

/**
 * GET /api/customers/[id] - 取得單一客戶
 */
export const GET = withAuth('customers:read')<{ id: string }>(
  async (_request, { user, db }, { id }) => {
    // 取得客戶資料
    const customer = await getCustomerById(db, user.id, id)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  }
)

/**
 * PUT /api/customers/[id] - 更新客戶
 */
export const PUT = withAuth('customers:write')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    // 取得請求資料
    interface ContactInfo {
      name?: string
      phone?: string
      email?: string
      title?: string
      notes?: string
    }
    const rawBody = (await request.json()) as UpdateCustomerRequest & {
      secondary_contact?: ContactInfo | null
      referrer?: ContactInfo | null
    }

    // 安全：過濾非白名單欄位（防止 Mass Assignment 攻擊）
    const body = validateFields(rawBody, CUSTOMER_ALLOWED_FIELDS) as typeof rawBody

    // 轉換為 DAL 期望的格式
    const updateData: Partial<{
      name: { zh: string; en: string }
      email: string
      phone: string
      fax: string
      address: { zh: string; en: string }
      tax_id: string
      contact_person: { name: string; phone: string; email: string }
      notes: string
      company_id: string
      secondary_contact: ContactInfo | null
      referrer: ContactInfo | null
    }> = {}

    if (body.name !== undefined) {
      updateData.name =
        typeof body.name === 'string'
          ? { zh: body.name, en: body.name }
          : (body.name as { zh: string; en: string })
    }
    if (body.email !== undefined && body.email !== null) {
      updateData.email = body.email
    }
    if (body.phone !== undefined && body.phone !== null) {
      updateData.phone = body.phone
    }
    if (body.fax !== undefined && body.fax !== null) {
      updateData.fax = body.fax
    }
    if (body.address !== undefined && body.address !== null) {
      updateData.address =
        typeof body.address === 'string'
          ? { zh: body.address, en: body.address }
          : (body.address as { zh: string; en: string })
    }
    if (body.tax_id !== undefined && body.tax_id !== null) {
      updateData.tax_id = body.tax_id
    }
    if (body.contact_person !== undefined && body.contact_person !== null) {
      if (typeof body.contact_person === 'string') {
        updateData.contact_person = { name: body.contact_person, phone: '', email: '' }
      } else {
        const cp = body.contact_person as {
          zh?: string
          en?: string
          name?: string
          phone?: string
          email?: string
        }
        updateData.contact_person = {
          name: cp.name || cp.zh || '',
          phone: cp.phone || '',
          email: cp.email || '',
        }
      }
    }
    if (body.company_id !== undefined && body.company_id !== null) {
      updateData.company_id = body.company_id
    }
    if (body.secondary_contact !== undefined) {
      updateData.secondary_contact = body.secondary_contact
    }
    if (body.referrer !== undefined) {
      updateData.referrer = body.referrer
    }

    // 更新客戶（DAL 會自動處理 JSON 序列化）
    const customer = await updateCustomer(db, user.id, id, updateData)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  }
)

/**
 * DELETE /api/customers/[id] - 刪除客戶
 * 支援 forceDelete 參數，可連同刪除關聯的報價單和付款紀錄
 */
export const DELETE = withAuth('customers:delete')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    // 解析 request body 取得 forceDelete 參數
    let forceDelete = false
    try {
      const body = await request.json()
      forceDelete = body?.forceDelete === true
    } catch {
      // 沒有 body 或解析失敗，使用預設值 false
    }

    // 如果 forceDelete，先刪除關聯的紀錄
    if (forceDelete) {
      // 刪除關聯的 payments
      const { error: paymentsError } = await db
        .from('payments')
        .delete()
        .eq('customer_id', id)

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
        .eq('customer_id', id)

      if (schedulesError) {
        console.error('Error deleting related payment schedules:', schedulesError)
        return NextResponse.json({
          error: '刪除關聯付款排程失敗'
        }, { status: 500 })
      }

      // 取得所有關聯的報價單
      const { data: quotations } = await db
        .from('quotations')
        .select('id')
        .eq('customer_id', id)

      // 刪除每個報價單的項目
      if (quotations && quotations.length > 0) {
        for (const quotation of quotations) {
          await db
            .from('quotation_items')
            .delete()
            .eq('quotation_id', quotation.id)
        }
      }

      // 刪除關聯的 quotations
      const { error: quotationsError } = await db
        .from('quotations')
        .delete()
        .eq('customer_id', id)

      if (quotationsError) {
        console.error('Error deleting related quotations:', quotationsError)
        return NextResponse.json({
          error: '刪除關聯報價單失敗'
        }, { status: 500 })
      }
    }

    // 刪除客戶
    try {
      await deleteCustomer(db, user.id, id)
    } catch (deleteError: unknown) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError)

      // 檢測外鍵約束錯誤，提供友善訊息
      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('23503')) {
        if (errorMessage.includes('payments')) {
          return NextResponse.json({
            error: '無法刪除此客戶，因為已有相關的付款紀錄。請勾選「連同刪除關聯紀錄」後再試。',
            code: 'HAS_RELATED_PAYMENTS'
          }, { status: 400 })
        }
        if (errorMessage.includes('quotations')) {
          return NextResponse.json({
            error: '無法刪除此客戶，因為已有相關的報價單。請勾選「連同刪除關聯紀錄」後再試。',
            code: 'HAS_RELATED_QUOTATIONS'
          }, { status: 400 })
        }
        return NextResponse.json({
          error: '無法刪除此客戶，因為有其他資料正在使用此紀錄。',
          code: 'HAS_RELATED_RECORDS'
        }, { status: 400 })
      }
      throw deleteError
    }

    return NextResponse.json({ message: 'Customer deleted successfully' })
  }
)
