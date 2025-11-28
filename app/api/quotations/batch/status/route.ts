import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { batchRateLimiter } from '@/lib/middleware/rate-limiter'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getErrorMessage } from '@/app/api/utils/error-handler'

// Note: Cannot use edge runtime because rate-limiter uses crypto which requires Node.js APIs

type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'approved'

interface BatchStatusBody {
  ids: string[];
  status: QuotationStatus;
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

    const db = getSupabaseClient()
    const kv = getKVCache(env)

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

    let updatedCount = 0
    const errors: string[] = []

    for (const id of ids) {
      try {
        const { data: existingQuotation, error: fetchError } = await db
          .from('quotations')
          .select('id')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (fetchError || !existingQuotation) {
          errors.push(`Quotation ${id} not found or unauthorized`)
          continue
        }

        const { error: updateError } = await db
          .from('quotations')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', user.id)

        if (updateError) {
          throw updateError
        }

        updatedCount++
      } catch (error: unknown) {
        console.error(`Error updating quotation ${id}:`, error)
        errors.push(`Failed to update quotation ${id}: ${getErrorMessage(error)}`)
      }
    }

    if (updatedCount === 0) {
      return NextResponse.json(
        { error: 'No quotations were updated', details: errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `Successfully updated ${updatedCount} out of ${ids.length} quotations to status: ${status}`,
      updatedCount,
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