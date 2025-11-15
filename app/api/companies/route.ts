import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getUserCompanies, createCompany, addCompanyMember } from '@/lib/dal/companies'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Note: Edge runtime removed for OpenNext compatibility

interface CreateCompanyRequestBody {
  name: { zh: string; en: string } | string;
  logo_url?: string;
  signature_url?: string;
  passbook_url?: string;
  tax_id?: string;
  bank_name?: string;
  bank_account?: string;
  bank_code?: string;
  address?: { zh: string; en: string } | string;
  phone?: string;
  email?: string;
  website?: string;
}


/**
 * GET /api/companies - 取得使用者的所有公司
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
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'companies:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json() as CreateCompanyRequestBody

    // 建立公司
    const company = await createCompany(db, {
      name: typeof body.name === 'string' ? { zh: body.name, en: body.name } : body.name,
      logo_url: body.logo_url || undefined,
      signature_url: body.signature_url || undefined,
      passbook_url: body.passbook_url || undefined,
      tax_id: body.tax_id || undefined,
      bank_name: body.bank_name || undefined,
      bank_account: body.bank_account || undefined,
      bank_code: body.bank_code || undefined,
      address: typeof body.address === 'string' ? { zh: body.address, en: body.address } : body.address || undefined,
      phone: body.phone || undefined,
      email: body.email || undefined,
      website: body.website || undefined
    })

    // 將建立者加入為公司成員（owner）
    await addCompanyMember(db, company.id, user.id, 'owner')

    return NextResponse.json(company, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
