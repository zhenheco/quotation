import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getSupabaseClient } from '@/lib/db/supabase-client'
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

    const db = getSupabaseClient()
    const userId = user.id

    // 開始按順序刪除所有相關資料

    // 1. 刪除付款排程
    await db.from('payment_schedules').delete().eq('user_id', userId)

    // 2. 刪除付款條款
    await db.from('payment_terms').delete().eq('user_id', userId)

    // 3. 刪除合約
    await db.from('contracts').delete().eq('user_id', userId)

    // 4. 查詢需要刪除的報價單 ID
    const { data: quotationsToDelete } = await db
      .from('quotations')
      .select('id')
      .eq('user_id', userId)

    // 5. 刪除報價單項目
    if (quotationsToDelete && quotationsToDelete.length > 0) {
      const quotationIds = quotationsToDelete.map(q => q.id)
      await db.from('quotation_items').delete().in('quotation_id', quotationIds)
    }

    // 6. 刪除報價單
    await db.from('quotations').delete().eq('user_id', userId)

    // 7. 刪除產品
    await db.from('products').delete().eq('user_id', userId)

    // 8. 刪除客戶
    await db.from('customers').delete().eq('user_id', userId)

    // 9. 查詢用戶擁有的公司
    const { data: ownedCompanies } = await db
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .eq('is_owner', true)

    // 10. 刪除公司成員關係
    await db.from('company_members').delete().eq('user_id', userId)

    // 11. 刪除用戶擁有的公司及其所有成員
    if (ownedCompanies && ownedCompanies.length > 0) {
      for (const { company_id } of ownedCompanies) {
        // 刪除公司成員
        await db.from('company_members').delete().eq('company_id', company_id)
        // 刪除公司
        await db.from('companies').delete().eq('id', company_id)
      }
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
