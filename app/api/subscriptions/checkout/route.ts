/**
 * 訂閱付款 API
 *
 * POST /api/subscriptions/checkout
 * 建立付款請求，返回 PAYUNi 表單資料
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import {
  PaymentGatewayClient,
  type CreatePaymentParams,
} from '@/lib/sdk/payment-gateway-client'
import { SubscriptionTier, BillingCycle, getSubscriptionPlanByTier } from '@/lib/dal/subscriptions'
import { trackRegistration } from '@/lib/services/affiliate-tracking'

/**
 * POST /api/subscriptions/checkout
 * 建立訂閱付款請求
 *
 * Body:
 * - tier: 方案層級 (STARTER | STANDARD | PROFESSIONAL)
 * - billing_cycle: 計費週期 (MONTHLY | YEARLY)
 * - company_id: 公司 ID
 * - referral_code?: 推薦碼（可選）
 */
export async function POST(request: Request) {
  try {
    // 檢查付款系統環境變數
    const apiKey = process.env.AFFILIATE_PAYMENT_API_KEY?.trim()
    const siteCode = process.env.AFFILIATE_PAYMENT_SITE_CODE?.trim()

    if (!apiKey || !siteCode) {
      console.error('[Checkout] 付款系統環境變數未設定:', {
        hasApiKey: !!apiKey,
        hasSiteCode: !!siteCode,
      })
      return NextResponse.json(
        { success: false, error: '付款系統尚未設定，請聯繫管理員' },
        { status: 503 }
      )
    }

    // 驗證用戶
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: '未登入' }, { status: 401 })
    }

    if (!user.email) {
      return NextResponse.json(
        { success: false, error: '無法取得用戶 Email' },
        { status: 400 }
      )
    }

    // 解析請求
    const body = (await request.json()) as {
      tier: SubscriptionTier
      billing_cycle: BillingCycle
      company_id: string
      referral_code?: string
    }

    // 驗證必填參數
    if (!body.tier || !body.billing_cycle || !body.company_id) {
      return NextResponse.json(
        { success: false, error: '缺少必填參數' },
        { status: 400 }
      )
    }

    // 驗證方案
    if (body.tier === 'FREE') {
      return NextResponse.json(
        { success: false, error: '免費方案無需付款' },
        { status: 400 }
      )
    }

    // 從資料庫讀取方案價格
    const db = getSupabaseClient()
    const plan = await getSubscriptionPlanByTier(db, body.tier)
    if (!plan) {
      return NextResponse.json(
        { success: false, error: '無效的方案' },
        { status: 400 }
      )
    }

    // 計算價格和折扣
    const basePrice = body.billing_cycle === 'YEARLY' ? plan.yearly_price : plan.monthly_price
    let discount = 0

    // 處理推薦碼折扣（首月 50%）
    if (body.referral_code && body.billing_cycle === 'MONTHLY') {
      const { data: referrer } = await db
        .from('user_profiles')
        .select('user_id')
        .eq('referral_code', body.referral_code.toUpperCase())
        .single()

      if (referrer) {
        discount = Math.floor(basePrice * 0.5)

        await trackRegistration({
          referralCode: body.referral_code.toUpperCase(),
          referredUserId: user.id,
          referredUserEmail: user.email,
        }).catch(console.error)
      }
    }

    const finalPrice = basePrice - discount

    // 生成訂單 ID（移除底線以符合 PAYUNi 規範）
    const sanitizedCompanyId = body.company_id.replace(/_/g, '-')
    const orderId = `SUB-${sanitizedCompanyId.substring(0, 8)}-${Date.now()}`

    // 建立付款請求
    const paymentClient = new PaymentGatewayClient({
      apiKey,
      siteCode,
      webhookSecret: process.env.AFFILIATE_PAYMENT_WEBHOOK_SECRET?.trim(),
      environment: 'production',
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://quote24.cc'
    const callbackUrl = `${appUrl}/pricing/callback?order_id=${orderId}&tier=${body.tier}&amount=${finalPrice}`

    const paymentParams: CreatePaymentParams = {
      orderId,
      amount: finalPrice,
      description: `${plan.name} - ${body.billing_cycle === 'YEARLY' ? '年繳' : '月繳'}`,
      email: user.email,
      callbackUrl,
      metadata: {
        company_id: body.company_id,
        tier: body.tier,
        billing_cycle: body.billing_cycle,
        user_id: user.id,
        original_price: basePrice.toString(),
        discount: discount.toString(),
        referral_code: body.referral_code || '',
      },
    }

    // 月繳使用定期定額
    if (body.billing_cycle === 'MONTHLY') {
      const firstPaymentDate = new Date()
      firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 1)
      const firstDateStr = firstPaymentDate.toISOString().split('T')[0]

      paymentParams.periodParams = {
        periodType: 'M',
        periodAmt: basePrice,
        periodTimes: 12,
        periodFirstdate: firstDateStr,
        periodPoint: String(new Date().getDate()).padStart(2, '0'),
        periodStartType: 2,
      }
    }

    const result = await paymentClient.createPayment(paymentParams)
    const paymentForm = result.paymentForm || result.payuniForm

    if (!result.success || !paymentForm) {
      return NextResponse.json(
        { success: false, error: '建立付款失敗' },
        { status: 500 }
      )
    }

    // 記錄待付款訂單
    const { error: insertError } = await db.from('subscription_orders').insert({
      id: result.paymentId,
      order_id: orderId,
      company_id: body.company_id,
      user_id: user.id,
      tier: body.tier,
      billing_cycle: body.billing_cycle,
      amount: finalPrice,
      original_amount: basePrice,
      discount,
      referral_code: body.referral_code || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Failed to record subscription order:', insertError)
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: result.paymentId,
        orderId,
        amount: finalPrice,
        originalAmount: basePrice,
        discount,
        paymentForm,
      },
    })
  } catch (error) {
    console.error('Checkout API error:', error)
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}
