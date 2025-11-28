import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { batchMarkOverduePaymentSchedules } from '@/lib/dal/payments'
import { getD1Client } from '@/lib/db/d1-client'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { headers } from 'next/headers'

// 錯誤通知函數
async function sendErrorNotification(error: Error) {
  const webhookUrl = process.env.ERROR_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.error('No webhook URL configured for error notifications')
    return
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `⚠️ Mark Overdue Payments Failed`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Mark Overdue Payments Failed*\n\`\`\`${getErrorMessage(error)}\`\`\``
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Time: ${new Date().toISOString()}`
              }
            ]
          }
        ]
      })
    })
  } catch (notifyError) {
    console.error('Failed to send error notification:', notifyError)
  }
}

// 成功通知函數
async function sendSuccessNotification(totalUpdated: number, userCount: number) {
  // 只在設定了通知 URL 且為生產環境時發送成功通知
  if (process.env.NODE_ENV !== 'production') return

  const webhookUrl = process.env.SUCCESS_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `✅ Marked ${totalUpdated} overdue payments for ${userCount} users`
      })
    })
  } catch (error) {
    console.error('Failed to send success notification:', error)
  }
}

export async function GET() {
  const { env } = await getCloudflareContext()

  try {
    // 驗證請求來源 (Vercel Cron 會帶上特殊的 header)
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // 強制要求 CRON_SECRET（生產環境必須設定）
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

    console.log('🕒 Starting scheduled mark overdue payments job...')
    const startTime = Date.now()

    const db = getD1Client(env)

    // 查詢所有活躍使用者
    const users = await db.query<{ user_id: string }>(
      'SELECT DISTINCT user_id FROM payment_schedules WHERE status = ?',
      ['pending']
    )

    console.log(`📊 Found ${users.length} users with pending payment schedules`)

    // 為每個使用者標記逾期付款
    const results = []
    let totalUpdated = 0

    for (const user of users) {
      try {
        const result = await batchMarkOverduePaymentSchedules(db, user.user_id)

        results.push({
          user_id: user.user_id,
          updated_count: result.updated_count,
          schedule_ids: result.schedule_ids,
          success: true
        })

        totalUpdated += result.updated_count

        if (result.updated_count > 0) {
          console.log(`✅ Marked ${result.updated_count} overdue schedules for user ${user.user_id}`)
        }
      } catch (error) {
        console.error(`❌ Failed to process user ${user.user_id}:`, error)
        results.push({
          user_id: user.user_id,
          updated_count: 0,
          schedule_ids: [],
          success: false,
          error: getErrorMessage(error)
        })
      }
    }

    const duration = Date.now() - startTime
    const successCount = results.filter(r => r.success).length

    // 如果有任何失敗，發送錯誤通知
    if (successCount < users.length) {
      const failedUsers = results
        .filter(r => !r.success)
        .map(r => r.user_id)
        .join(', ')

      await sendErrorNotification(
        new Error(`Failed to mark overdue for users: ${failedUsers}`)
      )
    } else if (totalUpdated > 0) {
      // 全部成功且有更新，發送成功通知（僅生產環境）
      await sendSuccessNotification(totalUpdated, users.length)
    }

    // 返回詳細結果
    return NextResponse.json({
      success: successCount === users.length,
      message: `Marked ${totalUpdated} overdue payments for ${successCount}/${users.length} users`,
      duration: `${duration}ms`,
      results,
      nextRun: getNextRunTime()
    })
  } catch (error) {
    console.error('❌ Cron job failed:', error)

    // 發送錯誤通知
    await sendErrorNotification(error as Error)

    return NextResponse.json(
      {
        error: 'Mark overdue payments failed',
        message: error instanceof Error ? getErrorMessage(error) : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 手動觸發端點（用於測試）
export async function POST(request: Request) {
  const { env } = await getCloudflareContext()

  try {
    // 驗證請求（可以用 API key 或其他方式）
    const body = await request.json() as Record<string, unknown>
    const apiKey = body.apiKey || request.headers.get('x-api-key')

    if (apiKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔧 Manual mark overdue triggered')

    const db = getD1Client(env)

    // 查詢所有活躍使用者
    const users = await db.query<{ user_id: string }>(
      'SELECT DISTINCT user_id FROM payment_schedules WHERE status = ?',
      ['pending']
    )

    // 執行標記
    const results = []
    let totalUpdated = 0

    for (const user of users) {
      const result = await batchMarkOverduePaymentSchedules(db, user.user_id)
      results.push({
        user_id: user.user_id,
        updated_count: result.updated_count
      })
      totalUpdated += result.updated_count
    }

    return NextResponse.json({
      success: true,
      message: `Manual mark overdue completed: ${totalUpdated} schedules updated`,
      results
    })
  } catch (error) {
    console.error('Manual mark overdue failed:', error)
    return NextResponse.json(
      { error: 'Manual mark overdue failed', message: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// 計算下次執行時間（每日 00:00 UTC）
function getNextRunTime(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}
