/**
 * Affiliate Payment Webhook Handler
 *
 * 處理來自 affiliate 系統金流服務的付款通知
 * POST /api/webhooks/affiliate-payment
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  parsePaymentWebhook,
  handlePaymentFailed,
  PaymentGatewayError,
} from '@/lib/services/affiliate-payment'
import { createCommission } from '@/lib/services/affiliate-tracking'
import { upgradePlan } from '@/lib/services/subscription'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import type { SubscriptionTier, BillingCycle } from '@/lib/dal/subscriptions'

/**
 * POST /api/webhooks/affiliate-payment
 *
 * 接收並處理付款 Webhook 事件
 */
export async function POST(request: NextRequest) {
  try {
    // 取得原始請求 body
    const rawBody = await request.text()
    const signature = request.headers.get('X-Webhook-Signature')

    // 驗證並解析 Webhook 事件
    let event
    try {
      event = await parsePaymentWebhook(rawBody, signature)
    } catch (error) {
      if (error instanceof PaymentGatewayError) {
        console.error('[Webhook] Signature verification failed:', error.message)
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 401 }
        )
      }
      throw error
    }

    console.log('[Webhook] Received payment event:', {
      paymentId: event.paymentId,
      orderId: event.orderId,
      status: event.status,
      amount: event.amount,
    })

    // 根據付款狀態處理
    switch (event.status) {
      case 'SUCCESS':
        return await handleSuccessEvent(event)

      case 'FAILED':
        await handlePaymentFailed(event)
        return NextResponse.json({ success: true, message: 'Failure logged' })

      case 'CANCELLED':
        console.log('[Webhook] Payment cancelled:', event.orderId)
        return NextResponse.json({ success: true, message: 'Cancellation noted' })

      case 'REFUNDED':
        console.log('[Webhook] Payment refunded:', event.orderId)
        // TODO: 處理退款邏輯（降級訂閱等）
        return NextResponse.json({ success: true, message: 'Refund noted' })

      default:
        console.warn('[Webhook] Unknown payment status:', event.status)
        return NextResponse.json({ success: true, message: 'Status noted' })
    }
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 處理付款成功事件
 */
async function handleSuccessEvent(event: {
  paymentId: string
  orderId: string
  status: string
  amount?: number
  paidAt?: string
  metadata?: Record<string, string>
}) {
  const { orderId, paymentId, metadata, amount, paidAt } = event

  // 驗證 metadata
  if (!metadata?.company_id || !metadata?.tier) {
    console.error('[Webhook] Missing required metadata:', metadata)
    return NextResponse.json(
      { error: 'Missing required metadata' },
      { status: 400 }
    )
  }

  const {
    company_id: companyId,
    tier,
    billing_cycle: billingCycle,
    type,
  } = metadata

  console.log('[Webhook] Processing successful payment:', {
    orderId,
    paymentId,
    companyId,
    tier,
    billingCycle,
    type,
    amount,
    paidAt,
  })

  const db = getSupabaseClient()

  try {
    // 1. 升級訂閱
    const upgradeResult = await upgradePlan(
      companyId,
      tier as SubscriptionTier,
      {
        billingCycle: billingCycle as BillingCycle,
        changedBy: 'system:affiliate-payment',
        externalSubscriptionId: paymentId,
      },
      db
    )

    if (!upgradeResult.success) {
      console.error('[Webhook] Subscription upgrade failed:', upgradeResult.error)
      // 即使升級失敗，也返回 200 避免重複 webhook
      // 但記錄錯誤以便人工處理
      await logPaymentError(db, {
        paymentId,
        orderId,
        companyId,
        tier,
        error: upgradeResult.error || 'Unknown upgrade error',
      })
    } else {
      console.log('[Webhook] Subscription upgraded successfully:', {
        companyId,
        tier,
        subscriptionId: upgradeResult.subscription?.id,
      })
    }

    // 2. 如果有推薦關係，建立佣金
    if (amount && amount > 0) {
      // 查詢公司擁有者的 user_id
      const { data: company } = await db
        .from('companies')
        .select('owner_user_id')
        .eq('id', companyId)
        .single()

      if (company?.owner_user_id) {
        const commissionResult = await createCommission({
          externalOrderId: orderId,
          orderAmount: amount,
          orderType: type || 'subscription',
          referredUserId: company.owner_user_id,
        })

        if (commissionResult.success && commissionResult.commissionId) {
          console.log('[Webhook] Commission created:', {
            commissionId: commissionResult.commissionId,
            amount: commissionResult.commissionAmount,
          })
        } else if (commissionResult.error !== 'Duplicate order (already processed)') {
          // 非重複訂單的錯誤才記錄
          console.warn('[Webhook] Commission creation skipped:', commissionResult.error)
        }
      }
    }

    // 3. 記錄付款成功
    await logPaymentSuccess(db, {
      paymentId,
      orderId,
      companyId,
      tier,
      amount,
      paidAt,
    })

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
    })
  } catch (error) {
    console.error('[Webhook] Error in handleSuccessEvent:', error)
    return NextResponse.json(
      { error: 'Internal processing error' },
      { status: 500 }
    )
  }
}

/**
 * 記錄付款成功
 */
async function logPaymentSuccess(
  db: ReturnType<typeof getSupabaseClient>,
  data: {
    paymentId: string
    orderId: string
    companyId: string
    tier: string
    amount?: number
    paidAt?: string
  }
) {
  try {
    // 可以寫入到自定義的付款記錄表
    // 目前先用 console.log 記錄
    console.log('[Webhook] Payment success logged:', data)
  } catch (error) {
    console.error('[Webhook] Failed to log payment success:', error)
  }
}

/**
 * 記錄付款錯誤
 */
async function logPaymentError(
  db: ReturnType<typeof getSupabaseClient>,
  data: {
    paymentId: string
    orderId: string
    companyId: string
    tier: string
    error: string
  }
) {
  try {
    // 可以寫入到錯誤記錄表
    console.error('[Webhook] Payment error logged:', data)
  } catch (error) {
    console.error('[Webhook] Failed to log payment error:', error)
  }
}
