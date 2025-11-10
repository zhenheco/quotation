import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getUserCompanies, createCompany, addCompanyMember } from '@/lib/dal/companies'
import { checkPermission } from '@/lib/cache/services'

export const runtime = 'edge'

/**
 * GET /api/companies - 取得使用者的所有公司
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

    const hasPermission = await checkPermission(kv, db, user.id, 'companies:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得使用者的公司列表
    const companies = await getUserCompanies(db, user.id)

    return NextResponse.json(companies)
  } catch (error: unknown) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/companies - 建立新公司
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

    const hasPermission = await checkPermission(kv, db, user.id, 'companies:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json()

    // 驗證必填欄位
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // 建立公司
    const company = await createCompany(db, {
      name: body.name,
      logo_url: body.logo_url || null,
      signature_url: body.signature_url || null,
      passbook_url: body.passbook_url || null,
      tax_id: body.tax_id || null,
      bank_name: body.bank_name || null,
      bank_account: body.bank_account || null,
      bank_code: body.bank_code || null,
      address: body.address || null,
      phone: body.phone || null,
      email: body.email || null,
      website: body.website || null
    })

    // 將建立者加入為公司成員（owner）
    await addCompanyMember(db, company.id, user.id, 'owner')

    return NextResponse.json(company, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
