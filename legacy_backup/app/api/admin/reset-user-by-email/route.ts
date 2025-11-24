import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getD1Client } from '@/lib/db/d1-client'
import { getCloudflareContext } from '@opennextjs/cloudflare'
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

    const { env } = await getCloudflareContext()
    const db = getD1Client(env)

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
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM quotations WHERE user_id = ?) as quotations,
        (SELECT COUNT(*) FROM customers WHERE user_id = ?) as customers,
        (SELECT COUNT(*) FROM products WHERE user_id = ?) as products,
        (SELECT COUNT(*) FROM contracts WHERE user_id = ?) as contracts,
        (SELECT COUNT(*) FROM payment_schedules WHERE user_id = ?) as payments
    `

    const beforeStats = await db.queryOne(statsQuery, [
      targetUserId, targetUserId, targetUserId, targetUserId, targetUserId
    ])

    // 執行清理
    await db.execute('DELETE FROM payment_schedules WHERE user_id = ?', [targetUserId])
    await db.execute('DELETE FROM payment_terms WHERE user_id = ?', [targetUserId])
    await db.execute('DELETE FROM contracts WHERE user_id = ?', [targetUserId])
    await db.execute(
      'DELETE FROM quotation_items WHERE quotation_id IN (SELECT id FROM quotations WHERE user_id = ?)',
      [targetUserId]
    )
    await db.execute('DELETE FROM quotations WHERE user_id = ?', [targetUserId])
    await db.execute('DELETE FROM products WHERE user_id = ?', [targetUserId])
    await db.execute('DELETE FROM customers WHERE user_id = ?', [targetUserId])
    await db.execute('DELETE FROM company_members WHERE user_id = ?', [targetUserId])

    // 查詢清理後的資料量
    const afterStats = await db.queryOne(statsQuery, [
      targetUserId, targetUserId, targetUserId, targetUserId, targetUserId
    ])

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
