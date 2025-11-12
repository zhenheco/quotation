import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getCompanyById, updateCompany, deleteCompany, isCompanyMember } from '@/lib/dal/companies'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'

interface UpdateCompanyRequestBody {
  name_zh?: string;
  name_en?: string;
  address_zh?: string;
  address_en?: string;
  logo_url?: string;
  signature_url?: string;
  passbook_url?: string;
  tax_id?: string;
  bank_name?: string;
  bank_account?: string;
  bank_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  [key: string]: unknown;
}


/**
 * GET /api/companies/[id] - 取得單一公司資料
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

    const hasPermission = await checkPermission(kv, db, user.id, 'companies:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 檢查是否為公司成員
    const isMember = await isCompanyMember(db, id, user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'You do not have access to this company' }, { status: 403 })
    }

    // 取得公司資料
    const company = await getCompanyById(db, id)

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error: unknown) {
    console.error('Error fetching company:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * PUT /api/companies/[id] - 更新公司資料
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

    const hasPermission = await checkPermission(kv, db, user.id, 'companies:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 檢查是否為公司成員
    const isMember = await isCompanyMember(db, id, user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'You do not have access to this company' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json() as Record<string, unknown> as UpdateCompanyRequestBody

    // 構建更新資料
    const updateData: Record<string, unknown> = {}

    // 處理名稱（合併中英文）
    if (body.name_zh || body.name_en) {
      const currentCompany = await getCompanyById(db, id)
      const currentName = currentCompany?.name || { zh: '', en: '' }
      updateData.name = {
        zh: body.name_zh || currentName.zh,
        en: body.name_en || currentName.en
      }
    }

    // 處理地址（合併中英文）
    if (body.address_zh || body.address_en) {
      const currentCompany = await getCompanyById(db, id)
      const currentAddress = currentCompany?.address || { zh: '', en: '' }
      updateData.address = {
        zh: body.address_zh || currentAddress.zh,
        en: body.address_en || currentAddress.en
      }
    }

    // 處理其他簡單欄位
    const simpleFields = [
      'logo_url', 'signature_url', 'passbook_url', 'tax_id',
      'bank_name', 'bank_account', 'bank_code', 'phone', 'email', 'website'
    ]

    for (const field of simpleFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // 更新公司資料
    const company = await updateCompany(db, id, updateData)

    return NextResponse.json(company)
  } catch (error: unknown) {
    console.error('Error updating company:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id] - 刪除公司（僅限 owner）
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

    const hasPermission = await checkPermission(kv, db, user.id, 'companies:delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 檢查是否為公司成員
    const isMember = await isCompanyMember(db, id, user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'You do not have access to this company' }, { status: 403 })
    }

    // 刪除公司
    await deleteCompany(db, id)

    return NextResponse.json({ message: 'Company deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
