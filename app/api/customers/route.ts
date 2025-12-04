import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getCustomers, createCustomer, createCustomerWithRetry } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'
import { CreateCustomerRequest } from '@/app/api/types'
import { getCloudflareContext } from '@opennextjs/cloudflare'
// Note: Edge runtime removed for OpenNext compatibility;


/**
 * GET /api/customers - 取得所有客戶
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext()

  try {
    // 驗證使用者（保留 Supabase Auth）
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限（使用 KV 快取）
    const kv = getKVCache(env)
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'customers:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得客戶資料（使用 DAL）
    const customers = await getCustomers(db, user.id)

    return NextResponse.json(customers)
  } catch (error: unknown) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/customers - 建立新客戶
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

    const hasPermission = await checkPermission(kv, db, user.id, 'customers:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json() as CreateCustomerRequest & { customer_number?: string }
    const { name, email, phone, fax, address, tax_id, contact_person, company_id, customer_number } = body

    // 驗證必填欄位
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // 準備客戶資料
    const customerData = {
      name: typeof name === 'string' ? { zh: name, en: name } : (name as { zh: string; en: string }),
      email: (email || undefined) as string,
      phone: phone || undefined,
      fax: fax || undefined,
      address: address ? (typeof address === 'string' ? { zh: address, en: address } : address) : undefined,
      tax_id: tax_id || undefined,
      contact_person: contact_person
        ? (typeof contact_person === 'string'
          ? { name: contact_person, phone: '', email: '' }
          : { name: (contact_person as { zh?: string; en?: string }).zh || '', phone: '', email: '' })
        : undefined
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
        company_id: company_id || undefined
      })
    } else if (company_id) {
      // 自動生成編號
      customer = await createCustomerWithRetry(db, user.id, company_id, customerData)
    } else {
      // 不帶編號建立
      customer = await createCustomer(db, user.id, customerData)
    }

    return NextResponse.json(customer, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
