import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { generateCustomerNumber } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * GET /api/customers/generate-number - 預先生成客戶編號
 * Query params: company_id (required)
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

    const hasPermission = await checkPermission(kv, db, user.id, 'customers:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得 company_id
    const companyId = request.nextUrl.searchParams.get('company_id')
    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    // 生成客戶編號
    const customerNumber = await generateCustomerNumber(db, companyId)

    return NextResponse.json({ customer_number: customerNumber })
  } catch (error: unknown) {
    console.error('Error generating customer number:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
