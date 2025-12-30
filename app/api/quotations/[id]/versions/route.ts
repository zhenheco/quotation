import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import type { QuotationVersion } from '@/types/models'

/**
 * GET /api/quotations/[id]/versions - 取得報價單版本歷史
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 查詢版本歷史
    const { data: rows, error: queryError } = await db
      .from('quotation_versions')
      .select('id, quotation_id, version_number, data, created_by, created_at')
      .eq('quotation_id', id)
      .order('version_number', { ascending: false })

    if (queryError) {
      throw queryError
    }

    const versions: QuotationVersion[] = (rows ?? []).map((row) => {
      const changes = typeof row.data === 'string' ? JSON.parse(row.data) : row.data

      return {
        id: row.id,
        quotation_id: row.quotation_id,
        version_number: row.version_number,
        changed_by: row.created_by,
        changed_at: row.created_at,
        changes: changes as Record<string, unknown>
      }
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Failed to fetch quotation versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch versions', message: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
