import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getSuppliers, createSupplier, createSupplierWithRetry } from '@/lib/dal/suppliers'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * GET /api/suppliers - 取得所有供應商
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

    const hasPermission = await checkPermission(kv, db, user.id, 'suppliers:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得查詢參數
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id') || undefined
    const isActiveParam = searchParams.get('is_active')
    const isActive = isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined

    // 取得供應商資料
    const suppliers = await getSuppliers(db, user.id, { companyId, isActive })

    // 設定快取
    const response = NextResponse.json(suppliers)
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
    return response
  } catch (error: unknown) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/suppliers - 建立新供應商
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

    const hasPermission = await checkPermission(kv, db, user.id, 'suppliers:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json() as {
      company_id: string
      supplier_number?: string
      name: { zh: string; en: string } | string
      code?: string
      contact_person?: { name: string; phone: string; email: string }
      phone?: string
      email?: string
      fax?: string
      address?: { zh: string; en: string } | string
      website?: string
      tax_id?: string
      payment_terms?: string
      payment_days?: number
      bank_name?: string
      bank_account?: string
      bank_code?: string
      swift_code?: string
      is_active?: boolean
      notes?: string
    }

    const { company_id, supplier_number, name, address, ...rest } = body

    if (!company_id) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    // 準備供應商資料
    const supplierData = {
      ...rest,
      name: typeof name === 'string' ? { zh: name, en: name } : name,
      address: address ? (typeof address === 'string' ? { zh: address, en: address } : address) : undefined,
    }

    // 建立供應商
    let supplier
    if (supplier_number) {
      // 使用者自訂編號
      supplier = await createSupplier(db, user.id, {
        ...supplierData,
        company_id,
        supplier_number
      })
    } else {
      // 自動生成編號
      supplier = await createSupplierWithRetry(db, user.id, company_id, supplierData)
    }

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating supplier:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
