/**
 * 訂閱管理 API
 *
 * GET /api/subscriptions - 取得公司的訂閱資訊
 * POST /api/subscriptions - 建立/更新訂閱
 */

import { NextResponse } from 'next/server'
import { withAuthOnly } from '@/lib/api/middleware'
import {
  getSubscription,
  getSubscriptionSummary,
  createFreeSubscription,
  upgradePlan,
  cancelSubscription,
} from '@/lib/services/subscription'
import { SubscriptionTier, BillingCycle } from '@/lib/dal/subscriptions'

/**
 * GET /api/subscriptions
 * 取得公司的訂閱資訊
 *
 * Query params:
 * - company_id: 公司 ID (必填)
 * - summary: 是否返回摘要格式 (可選, default: false)
 */
export const GET = withAuthOnly(async (request, { db }) => {
  const companyId = request.nextUrl.searchParams.get('company_id')
  const summary = request.nextUrl.searchParams.get('summary') === 'true'

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  if (summary) {
    const subscriptionSummary = await getSubscriptionSummary(companyId, db)
    return NextResponse.json({ data: subscriptionSummary })
  }

  const subscription = await getSubscription(companyId, db)

  if (!subscription) {
    // 如果沒有訂閱，嘗試建立免費訂閱
    const freeSubscription = await createFreeSubscription(companyId, db)

    if (!freeSubscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    const newSubscription = await getSubscription(companyId, db)
    return NextResponse.json({ data: newSubscription })
  }

  return NextResponse.json({ data: subscription })
})

/**
 * POST /api/subscriptions
 * 建立或更新訂閱
 *
 * Body:
 * - company_id: 公司 ID (必填)
 * - action: 'upgrade' | 'cancel' (必填)
 * - tier: 新方案層級 (upgrade 時必填)
 * - billing_cycle: 計費週期 (upgrade 時可選)
 * - reason: 取消原因 (cancel 時可選)
 * - effective_at: 生效時間 'immediately' | 'end_of_period' (可選)
 */
export const POST = withAuthOnly(async (request, { user, db }) => {
  const body = (await request.json()) as {
    company_id: string
    action: 'upgrade' | 'cancel'
    tier?: SubscriptionTier
    billing_cycle?: BillingCycle
    reason?: string
    effective_at?: 'immediately' | 'end_of_period'
    external_subscription_id?: string
    external_customer_id?: string
  }

  if (!body.company_id) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  if (!body.action) {
    return NextResponse.json(
      { error: "action is required ('upgrade' or 'cancel')" },
      { status: 400 }
    )
  }

  switch (body.action) {
    case 'upgrade': {
      if (!body.tier) {
        return NextResponse.json({ error: 'tier is required for upgrade' }, { status: 400 })
      }

      const result = await upgradePlan(
        body.company_id,
        body.tier,
        {
          billingCycle: body.billing_cycle,
          changedBy: user.id,
          externalSubscriptionId: body.external_subscription_id,
          externalCustomerId: body.external_customer_id,
        },
        db
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        message: `Successfully upgraded to ${body.tier}`,
        data: result.subscription,
      })
    }

    case 'cancel': {
      const result = await cancelSubscription(
        body.company_id,
        {
          effectiveAt: body.effective_at,
          reason: body.reason,
          changedBy: user.id,
        },
        db
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        message: 'Subscription cancelled',
        data: result.subscription,
      })
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
})
