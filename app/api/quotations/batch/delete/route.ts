import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { batchRateLimiter } from '@/lib/middleware/rate-limiter'

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

    // 獲取要刪除的報價單 IDs
    const { ids } = await request.json()
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids array required' },
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

    // 首先刪除相關的報價單項目
    const { error: itemsError } = await supabase
      .from('quotation_items')
      .delete()
      .in('quotation_id', ids)

    if (itemsError) {
      console.error('Error deleting quotation items:', itemsError)
      return NextResponse.json(
        { error: 'Failed to delete quotation items' },
        { status: 500 }
      )
    }

    // 然後刪除報價單
    const { error: deleteError } = await supabase
      .from('quotations')
      .delete()
      .eq('user_id', user.id)
      .in('id', ids)

    if (deleteError) {
      console.error('Error deleting quotations:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete quotations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Successfully deleted ${ids.length} quotations`,
      deletedCount: ids.length
    })
  } catch (error) {
    console.error('Batch delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}