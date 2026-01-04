/**
 * 訂閱方案列表 API
 *
 * GET /api/subscriptions/plans - 取得所有可用的訂閱方案
 */

import { NextResponse } from 'next/server'
import { getAllPlans, getPlanDetails } from '@/lib/services/subscription'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { SubscriptionTier } from '@/lib/dal/subscriptions'

/**
 * GET /api/subscriptions/plans
 * 取得所有可用的訂閱方案（公開 API，無需認證）
 *
 * Query params:
 * - tier: 特定方案層級 (可選，返回該方案的詳細資訊)
 * - lang: 語言 'zh' | 'en' (可選, default: 'zh')
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const tier = url.searchParams.get('tier') as SubscriptionTier | null
  const lang = (url.searchParams.get('lang') || 'zh') as 'zh' | 'en'

  const db = getSupabaseClient()

  if (tier) {
    // 返回特定方案的詳細資訊
    const planDetails = await getPlanDetails(tier, db)

    if (!planDetails) {
      return NextResponse.json({ error: `Plan ${tier} not found` }, { status: 404 })
    }

    // 根據語言返回適當的欄位
    const formattedPlan = {
      ...planDetails.plan,
      name: lang === 'en' ? planDetails.plan.name_en : planDetails.plan.name,
      description: lang === 'en' ? planDetails.plan.description_en : planDetails.plan.description,
      features: planDetails.features.map((f) => ({
        ...f,
        name: lang === 'en' ? f.name_en : f.name,
      })),
    }

    return NextResponse.json({ data: formattedPlan })
  }

  // 返回所有方案
  const plans = await getAllPlans(db)

  // 根據語言格式化
  const formattedPlans = plans.map((plan) => ({
    ...plan,
    name: lang === 'en' ? plan.name_en : plan.name,
    description: lang === 'en' ? plan.description_en : plan.description,
  }))

  return NextResponse.json({
    data: formattedPlans,
    meta: {
      total: formattedPlans.length,
      lang,
    },
  })
}
