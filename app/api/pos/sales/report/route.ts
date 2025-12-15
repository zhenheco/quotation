/**
 * POS 銷售報表 API Route
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getDailySalesReport } from '@/lib/services/pos'

/**
 * GET /api/pos/sales/report - 取得日銷售報表
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext()

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache(env)
    const db = getSupabaseClient()

    // 檢查權限
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:reports:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')
    const branchId = searchParams.get('branch_id')
    const date = searchParams.get('date')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }
    if (!branchId) {
      return NextResponse.json({ error: 'branch_id is required' }, { status: 400 })
    }
    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const report = await getDailySalesReport(db, tenantId, branchId, date)

    const response = NextResponse.json(report)
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
    return response
  } catch (error: unknown) {
    console.error('Error generating sales report:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
