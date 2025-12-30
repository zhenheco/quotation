import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { generateProductNumber } from '@/lib/dal/products'
import { checkPermission } from '@/lib/cache/services'

/**
 * GET /api/products/generate-number - 預先生成商品編號
 * Query params: company_id (required)
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'products:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得 company_id
    const companyId = request.nextUrl.searchParams.get('company_id')
    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    // 生成商品編號
    const productNumber = await generateProductNumber(db, companyId)

    return NextResponse.json({ product_number: productNumber })
  } catch (error: unknown) {
    console.error('Error generating product number:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
