/**
 * 發票過帳 API Route
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { postInvoiceById } from '@/lib/services/accounting'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/accounting/invoices/[id]/post - 過帳發票（產生傳票）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { env } = await getCloudflareContext()
  const { id } = await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache(env)
    const db = getSupabaseClient()

    // 檢查權限（需要過帳權限）
    const hasPermission = await checkPermission(kv, db, user.id, 'invoices:post')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await postInvoiceById(db, id, user.id)

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error posting invoice:', error)
    const message = getErrorMessage(error)
    if (message.includes('不存在')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('只能過帳')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
