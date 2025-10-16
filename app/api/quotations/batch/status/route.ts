import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { batchRateLimiter } from '@/lib/middleware/rate-limiter'

type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export async function POST(request: NextRequest) {
  return batchRateLimiter(request, async () => {
    try {
    const supabase = await createClient()

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 獲取要更新的報價單 IDs 和新狀態
    const { ids, status } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids array required' },
        { status: 400 }
      )
    }

    const validStatuses: QuotationStatus[] = ['draft', 'sent', 'accepted', 'rejected']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: draft, sent, accepted, rejected' },
        { status: 400 }
      )
    }

    // 驗證所有報價單都屬於當前用戶
    const { data: quotations, error: fetchError } = await supabase
      .from('quotations')
      .select('id')
      .eq('user_id', user.id)
      .in('id', ids)

    if (fetchError) {
      console.error('Error fetching quotations:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch quotations' },
        { status: 500 }
      )
    }

    if (!quotations || quotations.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some quotations not found or unauthorized' },
        { status: 403 }
      )
    }

    // 更新報價單狀態
    const { error: updateError, data } = await supabase
      .from('quotations')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .in('id', ids)
      .select()

    if (updateError) {
      console.error('Error updating quotations:', updateError)
      return NextResponse.json(
        { error: 'Failed to update quotations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Successfully updated ${ids.length} quotations to status: ${status}`,
      updatedCount: ids.length,
      status: status
    })
  } catch (error) {
    console.error('Batch status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}