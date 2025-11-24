import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getD1Client } from '@/lib/db/d1-client'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getErrorMessage } from '@/app/api/utils/error-handler'

// Note: Edge runtime removed for OpenNext compatibility

/**
 * DELETE /api/user/reset-data
 * 清空當前用戶的所有業務資料
 *
 * ⚠️  警告：此操作將永久刪除以下資料：
 * - 所有報價單
 * - 所有客戶
 * - 所有產品
 * - 所有合約
 * - 所有付款記錄
 * - 所有公司資料
 * - 所有公司成員關係
 *
 * 保留資料：
 * - 用戶帳號（Supabase Auth）
 * - RBAC 權限設定
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
    const userId = user.id

    // 開始交易式刪除所有相關資料
    // 注意：D1 目前不支援 BEGIN/COMMIT，所以我們按順序執行

    // 1. 刪除付款排程
    await db.execute(
      'DELETE FROM payment_schedules WHERE user_id = ?',
      [userId]
    )

    // 2. 刪除付款條款
    await db.execute(
      'DELETE FROM payment_terms WHERE user_id = ?',
      [userId]
    )

    // 3. 刪除合約
    await db.execute(
      'DELETE FROM contracts WHERE user_id = ?',
      [userId]
    )

    // 4. 刪除報價單項目
    await db.execute(
      'DELETE FROM quotation_items WHERE quotation_id IN (SELECT id FROM quotations WHERE user_id = ?)',
      [userId]
    )

    // 5. 刪除報價單
    await db.execute(
      'DELETE FROM quotations WHERE user_id = ?',
      [userId]
    )

    // 6. 刪除產品
    await db.execute(
      'DELETE FROM products WHERE user_id = ?',
      [userId]
    )

    // 7. 刪除客戶
    await db.execute(
      'DELETE FROM customers WHERE user_id = ?',
      [userId]
    )

    // 8. 刪除公司成員關係（但保留公司，其他成員可能還在使用）
    await db.execute(
      'DELETE FROM company_members WHERE user_id = ?',
      [userId]
    )

    // 9. 刪除用戶擁有的公司（is_owner = 1）
    const ownedCompanies = await db.query<{ id: string }>(
      'SELECT id FROM companies WHERE id IN (SELECT company_id FROM company_members WHERE user_id = ? AND is_owner = 1)',
      [userId]
    )

    for (const company of ownedCompanies) {
      // 刪除公司成員
      await db.execute(
        'DELETE FROM company_members WHERE company_id = ?',
        [company.id]
      )
      // 刪除公司
      await db.execute(
        'DELETE FROM companies WHERE id = ?',
        [company.id]
      )
    }

    return NextResponse.json({
      success: true,
      message: '所有業務資料已清空',
      deleted: {
        quotations: true,
        customers: true,
        products: true,
        contracts: true,
        payments: true,
        companies: true,
        userId: userId
      }
    })

  } catch (error: unknown) {
    console.error('Reset user data error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
