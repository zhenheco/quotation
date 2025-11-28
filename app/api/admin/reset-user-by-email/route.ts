import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { isSuperAdmin } from '@/lib/dal/rbac'

// Note: Edge runtime removed for OpenNext compatibility

/**
 * DELETE /api/admin/reset-user-by-email?email=xxx
 * 根據 email 清空用戶的所有業務資料（僅超級管理員可用）
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getSupabaseClient()

    // 檢查是否為超級管理員
    const isAdmin = await isSuperAdmin(db, user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
    }

    // 獲取目標用戶 email
    const { searchParams } = new URL(request.url)
    const targetEmail = searchParams.get('email')

    if (!targetEmail) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    // 查詢目標用戶
    const { data: targetUser, error: userError } = await supabase.auth.admin.listUsers()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const targetUserData = targetUser.users.find((u: { email?: string | null }) => u.email === targetEmail)

    if (!targetUserData) {
      return NextResponse.json({ error: `User not found: ${targetEmail}` }, { status: 404 })
    }

    const targetUserId = targetUserData.id

    // 查詢當前資料量
    const [
      { count: quotationsCount = 0 } = {},
      { count: customersCount = 0 } = {},
      { count: productsCount = 0 } = {},
      { count: contractsCount = 0 } = {},
      { count: paymentsCount = 0 } = {}
    ] = await Promise.all([
      db.from('quotations').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
      db.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
      db.from('products').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
      db.from('contracts').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
      db.from('payment_schedules').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId)
    ]).then(results => results.map(r => ({ count: r.count })))

    const beforeStats = {
      quotations: quotationsCount,
      customers: customersCount,
      products: productsCount,
      contracts: contractsCount,
      payments: paymentsCount
    }

    // 執行清理
    await db.from('payment_schedules').delete().eq('user_id', targetUserId)
    await db.from('payment_terms').delete().eq('user_id', targetUserId)
    await db.from('contracts').delete().eq('user_id', targetUserId)

    // 刪除 quotation_items（需要先查詢 quotation IDs）
    const { data: quotations } = await db.from('quotations').select('id').eq('user_id', targetUserId)
    if (quotations && quotations.length > 0) {
      const quotationIds = quotations.map(q => q.id)
      await db.from('quotation_items').delete().in('quotation_id', quotationIds)
    }

    await db.from('quotations').delete().eq('user_id', targetUserId)
    await db.from('products').delete().eq('user_id', targetUserId)
    await db.from('customers').delete().eq('user_id', targetUserId)
    await db.from('company_members').delete().eq('user_id', targetUserId)

    // 查詢清理後的資料量
    const [
      { count: quotationsCountAfter = 0 } = {},
      { count: customersCountAfter = 0 } = {},
      { count: productsCountAfter = 0 } = {},
      { count: contractsCountAfter = 0 } = {},
      { count: paymentsCountAfter = 0 } = {}
    ] = await Promise.all([
      db.from('quotations').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
      db.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
      db.from('products').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
      db.from('contracts').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
      db.from('payment_schedules').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId)
    ]).then(results => results.map(r => ({ count: r.count })))

    const afterStats = {
      quotations: quotationsCountAfter,
      customers: customersCountAfter,
      products: productsCountAfter,
      contracts: contractsCountAfter,
      payments: paymentsCountAfter
    }

    return NextResponse.json({
      success: true,
      message: `已清空用戶 ${targetEmail} 的所有業務資料`,
      targetUser: {
        id: targetUserId,
        email: targetEmail
      },
      before: beforeStats,
      after: afterStats
    })

  } catch (error: unknown) {
    console.error('Admin reset user data error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
