import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { batchRateLimiter } from '@/lib/middleware/rate-limiter'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'

interface BatchDeleteBody {
  ids: string[];
}

export async function POST(request: NextRequest) {
  return batchRateLimiter(request, async () => {
    try {
      const supabase = createApiClient(request)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const db = getSupabaseClient()
      const kv = getKVCache()

      const hasPermission = await checkPermission(kv, db, user.id, 'quotations:delete')
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions to delete quotations' },
          { status: 403 }
        )
      }

      const { ids } = await request.json() as BatchDeleteBody
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: 'Invalid request: ids array required' },
          { status: 400 }
        )
      }

      // 批次查詢存在且有權限的報價單
      const { data: existingQuotations, error: fetchError } = await db
        .from('quotations')
        .select('id')
        .in('id', ids)
        .eq('user_id', user.id)

      if (fetchError) {
        console.error('Error fetching quotations:', fetchError)
        return NextResponse.json(
          { error: 'Failed to verify quotations' },
          { status: 500 }
        )
      }

      const existingIds = new Set(existingQuotations?.map(q => q.id) || [])
      const notFoundIds = ids.filter(id => !existingIds.has(id))
      const validIds = ids.filter(id => existingIds.has(id))

      if (validIds.length === 0) {
        return NextResponse.json(
          { error: 'No quotations were deleted', details: notFoundIds.map(id => `Quotation ${id} not found or unauthorized`) },
          { status: 400 }
        )
      }

      // 批次刪除有效的報價單
      const { error: deleteError, count: deletedCount } = await db
        .from('quotations')
        .delete()
        .in('id', validIds)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Batch delete error:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete quotations' },
          { status: 500 }
        )
      }

      const errors = notFoundIds.map(id => `Quotation ${id} not found or unauthorized`)

      return NextResponse.json({
        message: `Successfully deleted ${deletedCount || validIds.length} out of ${ids.length} quotations`,
        deletedCount: deletedCount || validIds.length,
        total: ids.length,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (error) {
      console.error('Batch delete error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}