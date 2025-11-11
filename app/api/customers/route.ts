import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getCustomers, createCustomer } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'
import { CreateCustomerRequest } from '@/app/api/types'


/**
 * GET /api/customers - 取得所有客戶
 */
export async function GET(
  request: NextRequest,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    // 驗證使用者（保留 Supabase Auth）
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限（使用 KV 快取）
    const kv = getKVCache(env)
    const db = getD1Client(env)

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

    const hasPermission = await checkPermission(kv, db, user.id, 'customers:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json() as CreateCustomerRequest
    const { name, email, phone, address, tax_id, contact_person, company_id } = body

    // 驗證必填欄位
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // 建立客戶（DAL 會自動處理 JSON 序列化）
    const customer = await createCustomer(db, user.id, {
      name: typeof name === 'string' ? { zh: name, en: name } : (name as { zh: string; en: string }),
      email: (email || undefined) as string,
      phone: phone || undefined,
      address: address ? (typeof address === 'string' ? { zh: address, en: address } : address) : undefined,
      tax_id: tax_id || undefined,
      contact_person: contact_person ? (typeof contact_person === 'string' ? { zh: contact_person, en: contact_person } : contact_person) : undefined,
      company_id: company_id || undefined
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
