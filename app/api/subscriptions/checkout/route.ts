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
import { SubscriptionTier, BillingCycle } from '@/lib/dal/subscriptions'
import { trackRegistration } from '@/lib/services/affiliate-tracking'

// 方案價格定義（與前端 constants 同步）
const PLAN_PRICES: Record<
  SubscriptionTier,
  { monthly: number; yearly: number; name: string }
> = {
  FREE: { monthly: 0, yearly: 0, name: '免費版' },
  STARTER: { monthly: 299, yearly: 2990, name: '入門版' },
  STANDARD: { monthly: 599, yearly: 5990, name: '標準版' },
  PROFESSIONAL: { monthly: 1299, yearly: 12990, name: '專業版' },
}

/**
 * POST /api/subscriptions/checkout
 * 建立訂閱付款請求
 *
 * Body:
 * - tier: 方案層級 (STARTER | STANDARD | PROFESSIONAL)
 * - billing_cycle: 計費週期 (monthly | yearly)
 * - company_id: 公司 ID
 * - referral_code?: 推薦碼（可選）
 */
export async function POST(request: Request) {
  try {
    // 驗證用戶
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: '未登入' }, { status: 401 })
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

    const planPrices = PLAN_PRICES[body.tier]
    if (!planPrices) {
      return NextResponse.json(
        { success: false, error: '無效的方案' },
        { status: 400 }
      )
    }

    // 計算價格
    const basePrice =
      body.billing_cycle === 'YEARLY' ? planPrices.yearly : planPrices.monthly
    let finalPrice = basePrice
    let discount = 0

    // 處理推薦碼折扣（首月 50%）
    if (body.referral_code && body.billing_cycle === 'MONTHLY') {
      // 查詢推薦碼是否有效
      const db = getSupabaseClient()
      const { data: referrer } = await db
        .from('user_profiles')
        .select('user_id')
        .eq('referral_code', body.referral_code.toUpperCase())
        .single()

      if (referrer) {
        discount = Math.floor(basePrice * 0.5) // 50% 折扣
        finalPrice = basePrice - discount

        // 記錄推薦
        await trackRegistration({
          referralCode: body.referral_code.toUpperCase(),
          referredUserId: user.id,
          referredUserEmail: user.email || undefined,
        }).catch(console.error) // 不阻擋付款流程
      }
    }

    // 取得用戶 Email
    const userEmail = user.email
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: '無法取得用戶 Email' },
        { status: 400 }
      )
    }

    // 生成訂單 ID
    const orderId = `SUB-${body.company_id.substring(0, 8)}-${Date.now()}`

    // 建立付款請求
    const paymentClient = new PaymentGatewayClient({
      apiKey: process.env.AFFILIATE_PAYMENT_API_KEY?.trim() || '',
      siteCode: process.env.AFFILIATE_PAYMENT_SITE_CODE?.trim() || '',
      webhookSecret: process.env.AFFILIATE_PAYMENT_WEBHOOK_SECRET?.trim(),
      environment: 'production', // 使用正式環境
    })

    const paymentParams: CreatePaymentParams = {
      orderId,
      amount: finalPrice,
      description: `${planPrices.name} - ${body.billing_cycle === 'YEARLY' ? '年繳' : '月繳'}`,
      email: userEmail,
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

    // 年繳方案使用定期定額
    if (body.billing_cycle === 'YEARLY') {
      // 年繳一次付清，不使用定期定額
      // 下次續約時會重新建立付款
    } else {
      // 月繳使用定期定額
      const firstPaymentDate = new Date()
      firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 1)
      const firstDateStr = firstPaymentDate.toISOString().split('T')[0]

      paymentParams.periodParams = {
        periodType: 'M',
        periodAmt: basePrice, // 首次折扣後，後續恢復原價
        periodTimes: 12, // 最多 12 期，之後可續約
        periodFirstdate: firstDateStr,
        periodPoint: String(new Date().getDate()).padStart(2, '0'), // 每月同一天
        periodStartType: 2, // 首期日開始
      }
    }

    const result = await paymentClient.createPayment(paymentParams)

    if (!result.success || !result.paymentForm) {
      return NextResponse.json(
        { success: false, error: result.error || '建立付款失敗' },
        { status: 500 }
      )
    }

    // 記錄待付款訂單（用於 Webhook 回調時更新訂閱）
    const db = getSupabaseClient()
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
      // 表可能不存在，記錄到 log 但不阻擋付款
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
        paymentForm: result.paymentForm,
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
