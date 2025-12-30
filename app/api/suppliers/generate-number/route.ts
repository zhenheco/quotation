import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { generateSupplierNumber } from '@/lib/dal/suppliers'
import { checkPermission } from '@/lib/cache/services'

/**
 * GET /api/suppliers/generate-number - 預先生成供應商編號
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

    const hasPermission = await checkPermission(kv, db, user.id, 'suppliers:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得查詢參數
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    // 生成供應商編號
    const supplierNumber = await generateSupplierNumber(db, companyId)

    return NextResponse.json({ supplier_number: supplierNumber })
  } catch (error: unknown) {
    console.error('Error generating supplier number:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
