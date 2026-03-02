/**
 * Subscription Downgrade Cron Job
 *
 * 每日 UTC 01:00 執行，自動處理過期訂閱：
 * 1. 將 ACTIVE 且 current_period_end < now 的訂閱降級為 FREE
 * 2. 將 cancelled_at 不為 null 且 current_period_end < now 的訂閱執行取消
 *
 * GET /api/cron/subscription-downgrade
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { downgradePlan, cancelSubscription } from '@/lib/services/subscription'

interface DowngradeResult {
  company_id: string
  action: 'downgrade' | 'cancel'
  success: boolean
  error?: string
}

export async function GET() {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting subscription downgrade job...')
    const startTime = Date.now()
    const db = getSupabaseClient()
    const now = new Date().toISOString()
    const results: DowngradeResult[] = []

    // 1. 查詢已過期的 ACTIVE 訂閱（current_period_end < now）
    const { data: expiredSubscriptions, error: expiredError } = await db
      .from('company_subscriptions')
      .select('company_id, status, cancelled_at, current_period_end')
      .eq('status', 'ACTIVE')
      .lt('current_period_end', now)

    if (expiredError) {
      throw new Error(`Failed to query expired subscriptions: ${expiredError.message}`)
    }

    const expiredList = expiredSubscriptions || []
    console.log(`[CRON] Found ${expiredList.length} expired subscriptions`)

    // 分類：有 cancelled_at 的要取消，沒有的要降級
    const toCancel = expiredList.filter(s => s.cancelled_at !== null)
    const toDowngrade = expiredList.filter(s => s.cancelled_at === null)

    // 2. 處理降級（ACTIVE 且過期，未標記取消）
    for (const sub of toDowngrade) {
      try {
        const result = await downgradePlan(
          sub.company_id,
          'FREE',
          {
            effectiveAt: 'immediately',
            changedBy: 'system:cron',
            reason: 'Subscription period expired',
          },
          db
        )

        results.push({
          company_id: sub.company_id,
          action: 'downgrade',
          success: result.success,
          error: result.error,
        })

        if (result.success) {
          console.log(`[CRON] Downgraded subscription for company ${sub.company_id}`)
        } else {
          console.error(`[CRON] Failed to downgrade company ${sub.company_id}:`, result.error)
        }
      } catch (error) {
        console.error(`[CRON] Error downgrading company ${sub.company_id}:`, error)
        results.push({
          company_id: sub.company_id,
          action: 'downgrade',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // 3. 處理取消（已標記 cancelled_at 且過期）
    for (const sub of toCancel) {
      try {
        const result = await cancelSubscription(
          sub.company_id,
          {
            effectiveAt: 'immediately',
            reason: 'Cancelled subscription period ended',
            changedBy: 'system:cron',
          },
          db
        )

        results.push({
          company_id: sub.company_id,
          action: 'cancel',
          success: result.success,
          error: result.error,
        })

        if (result.success) {
          console.log(`[CRON] Cancelled subscription for company ${sub.company_id}`)
        } else {
          console.error(`[CRON] Failed to cancel company ${sub.company_id}:`, result.error)
        }
      } catch (error) {
        console.error(`[CRON] Error cancelling company ${sub.company_id}:`, error)
        results.push({
          company_id: sub.company_id,
          action: 'cancel',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const duration = Date.now() - startTime
    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount

    console.log(`[CRON] Subscription downgrade job completed in ${duration}ms:`, {
      total: results.length,
      downgraded: results.filter(r => r.action === 'downgrade' && r.success).length,
      cancelled: results.filter(r => r.action === 'cancel' && r.success).length,
      failed: failCount,
    })

    return NextResponse.json({
      success: failCount === 0,
      message: `Processed ${results.length} subscriptions: ${successCount} succeeded, ${failCount} failed`,
      duration: `${duration}ms`,
      summary: {
        downgraded: results.filter(r => r.action === 'downgrade' && r.success).length,
        cancelled: results.filter(r => r.action === 'cancel' && r.success).length,
        failed: failCount,
      },
      results,
    })
  } catch (error) {
    console.error('[CRON] Subscription downgrade job failed:', error)
    return NextResponse.json(
      {
        error: 'Subscription downgrade job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
