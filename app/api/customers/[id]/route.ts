import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCustomerById, updateCustomer, deleteCustomer } from '@/lib/dal/customers'
import { UpdateCustomerRequest } from '@/app/api/types'

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
    const body = (await request.json()) as UpdateCustomerRequest

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
 */
export const DELETE = withAuth('customers:delete')<{ id: string }>(
  async (_request, { user, db }, { id }) => {
    // 刪除客戶
    await deleteCustomer(db, user.id, id)

    return NextResponse.json({ message: 'Customer deleted successfully' })
  }
)
