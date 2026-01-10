import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/db/supabase-client'

/**
 * GET /api/user/referral-code
 * 取得當前用戶的推薦碼
 * 如果用戶沒有推薦碼，則自動生成一個
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: '未登入' }, { status: 401 })
    }

    const db = getSupabaseClient()

    // 查詢用戶的推薦碼
    const { data: profile, error: profileError } = await db
      .from('user_profiles')
      .select('referral_code')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { success: false, error: '無法取得用戶資料' },
        { status: 500 }
      )
    }

    let referralCode = profile?.referral_code

    // 如果沒有推薦碼，生成一個
    if (!referralCode) {
      referralCode = generateReferralCode()

      // 更新到資料庫
      const { error: updateError } = await db
        .from('user_profiles')
        .update({ referral_code: referralCode })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating referral code:', updateError)
        return NextResponse.json(
          { success: false, error: '無法生成推薦碼' },
          { status: 500 }
        )
      }
    }

    // 查詢推薦統計（簡化版，實際應該從 affiliate 表查詢）
    const stats = {
      referralCode,
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
    }

    // 嘗試查詢推薦統計
    try {
      const { data: referrals } = await db
        .from('affiliate_referrals')
        .select('id, status')
        .eq('referrer_user_id', user.id)

      if (referrals) {
        stats.totalReferrals = referrals.length
        stats.activeReferrals = referrals.filter(
          (r) => r.status === 'converted'
        ).length
      }

      const { data: commissions } = await db
        .from('affiliate_commissions')
        .select('amount, status')
        .eq('referrer_user_id', user.id)

      if (commissions) {
        stats.totalEarnings = commissions
          .filter((c) => c.status === 'paid')
          .reduce((sum, c) => sum + (c.amount || 0), 0)
        stats.pendingEarnings = commissions
          .filter((c) => c.status === 'pending')
          .reduce((sum, c) => sum + (c.amount || 0), 0)
      }
    } catch {
      // 表可能不存在，使用預設值
      console.log('Affiliate tables may not exist, using default stats')
    }

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error in referral-code API:', error)
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

/**
 * 生成 8 碼推薦碼
 * 格式: 大寫字母 + 數字
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除容易混淆的字元 (0, O, I, 1)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
