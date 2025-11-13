import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { batchRateLimiter } from '@/lib/middleware/rate-limiter'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getErrorMessage } from '@/app/api/utils/error-handler'

export const runtime = 'edge'

interface BatchDeleteBody {
  ids: string[];
}

export async function POST(request: NextRequest) {
  return batchRateLimiter(request, async () => {
    try {
      const { env } = await getCloudflareContext()
      const supabase = createApiClient(request)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const db = getD1Client(env)
      const kv = getKVCache(env)

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

      let deletedCount = 0
      const errors: string[] = []

      for (const id of ids) {
        try {
          const existingQuotation = await db.queryOne<{ id: string }>(
            'SELECT id FROM quotations WHERE id = ? AND user_id = ?',
            [id, user.id]
          )

          if (!existingQuotation) {
            errors.push(`Quotation ${id} not found or unauthorized`)
            continue
          }

          await db.execute(
            'DELETE FROM quotations WHERE id = ? AND user_id = ?',
            [id, user.id]
          )

          deletedCount++
        } catch (error: unknown) {
          console.error(`Error deleting quotation ${id}:`, error)
          errors.push(`Failed to delete quotation ${id}: ${getErrorMessage(error)}`)
        }
      }

      if (deletedCount === 0) {
        return NextResponse.json(
          { error: 'No quotations were deleted', details: errors },
          { status: 400 }
        )
      }

      return NextResponse.json({
        message: `Successfully deleted ${deletedCount} out of ${ids.length} quotations`,
        deletedCount,
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