import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { batchRateLimiter } from '@/lib/middleware/rate-limiter'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'

type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'approved'

interface BatchStatusBody {
  ids: string[];
  status: QuotationStatus;
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

      const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write')
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update quotations' },
          { status: 403 }
        )
      }

      const { ids, status } = await request.json() as BatchStatusBody

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: 'Invalid request: ids array required' },
          { status: 400 }
        )
      }

      const validStatuses: QuotationStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'approved']
      if (!status || !validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: draft, sent, accepted, rejected, approved' },
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
          { error: 'No quotations were updated', details: notFoundIds.map(id => `Quotation ${id} not found or unauthorized`) },
          { status: 400 }
        )
      }

      // 批次更新有效的報價單
      const { error: updateError, count: updatedCount } = await db
        .from('quotations')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', validIds)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Batch update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update quotations' },
          { status: 500 }
        )
      }

      const errors = notFoundIds.map(id => `Quotation ${id} not found or unauthorized`)

      return NextResponse.json({
        message: `Successfully updated ${updatedCount || validIds.length} out of ${ids.length} quotations to status: ${status}`,
        updatedCount: updatedCount || validIds.length,
        total: ids.length,
        status,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (error) {
      console.error('Batch status update error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}