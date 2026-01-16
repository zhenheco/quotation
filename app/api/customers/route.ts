import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCustomers, createCustomer, createCustomerWithRetry } from '@/lib/dal/customers'
import { CreateCustomerRequest } from '@/app/api/types'

/**
 * GET /api/customers - 取得所有客戶
 */
export const GET = withAuth('customers:read')(async (_request, { user, db }) => {
  // 取得客戶資料（使用 DAL）
  const customers = await getCustomers(db, user.id)

  // 不設定 HTTP 快取，確保更新後立即反映
  // React Query 已在前端處理快取，不需要 HTTP 層快取
  return NextResponse.json(customers)
})

/**
 * POST /api/customers - 建立新客戶
 */
export const POST = withAuth('customers:write')(async (request, { user, db }) => {
  // 取得請求資料
  interface ContactInfo {
    name?: string
    phone?: string
    email?: string
    title?: string
    notes?: string
  }
  const body = (await request.json()) as CreateCustomerRequest & {
    customer_number?: string
    secondary_contact?: ContactInfo | null
    referrer?: ContactInfo | null
  }
  const { name, email, phone, fax, address, tax_id, contact_person, company_id, customer_number, secondary_contact, referrer } =
    body

  // 準備客戶資料
  const customerData = {
    name: name
      ? typeof name === 'string'
        ? { zh: name, en: name }
        : (name as { zh: string; en: string })
      : { zh: '', en: '' },
    email: (email || '') as string,
    phone: phone || undefined,
    fax: fax || undefined,
    address: address
      ? typeof address === 'string'
        ? { zh: address, en: address }
        : address
      : undefined,
    tax_id: tax_id || undefined,
    contact_person: contact_person
      ? typeof contact_person === 'string'
        ? { name: contact_person, phone: '', email: '' }
        : { name: (contact_person as { zh?: string; en?: string }).zh || '', phone: '', email: '' }
      : undefined,
    secondary_contact: secondary_contact || undefined,
    referrer: referrer || undefined,
  }

  // 建立客戶
  // 如果提供了 customer_number（使用者自訂），直接使用
  // 如果提供了 company_id 但沒有 customer_number，自動生成
  // 如果都沒有，不帶編號建立
  let customer
  if (customer_number) {
    // 使用者自訂編號
    customer = await createCustomer(db, user.id, {
      ...customerData,
      customer_number,
      company_id: company_id || undefined,
    })
  } else if (company_id) {
    // 自動生成編號
    customer = await createCustomerWithRetry(db, user.id, company_id, customerData)
  } else {
    // 不帶編號建立
    customer = await createCustomer(db, user.id, customerData)
  }

  return NextResponse.json(customer, { status: 201 })
})
