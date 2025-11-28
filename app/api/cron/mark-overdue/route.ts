import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { batchMarkOverduePaymentSchedules } from '@/lib/dal/payments'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { headers } from 'next/headers'

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

async function sendSuccessNotification(totalUpdated: number, userCount: number) {
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

    console.log('🕒 Starting scheduled mark overdue payments job...')
    const startTime = Date.now()

    const db = getSupabaseClient()

    const { data: usersData, error: usersError } = await db
      .from('payment_schedules')
      .select('user_id')
      .eq('status', 'pending')

    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`)
    }

    const uniqueUserIds = [...new Set((usersData || []).map(u => u.user_id))]
    console.log(`📊 Found ${uniqueUserIds.length} users with pending payment schedules`)

    const results = []
    let totalUpdated = 0

    for (const userId of uniqueUserIds) {
      try {
        const result = await batchMarkOverduePaymentSchedules(db, userId)

        results.push({
          user_id: userId,
          updated_count: result.updated_count,
          schedule_ids: result.schedule_ids,
          success: true
        })

        totalUpdated += result.updated_count

        if (result.updated_count > 0) {
          console.log(`✅ Marked ${result.updated_count} overdue schedules for user ${userId}`)
        }
      } catch (error) {
        console.error(`❌ Failed to process user ${userId}:`, error)
        results.push({
          user_id: userId,
          updated_count: 0,
          schedule_ids: [],
          success: false,
          error: getErrorMessage(error)
        })
      }
    }

    const duration = Date.now() - startTime
    const successCount = results.filter(r => r.success).length

    if (successCount < uniqueUserIds.length) {
      const failedUsers = results
        .filter(r => !r.success)
        .map(r => r.user_id)
        .join(', ')

      await sendErrorNotification(
        new Error(`Failed to mark overdue for users: ${failedUsers}`)
      )
    } else if (totalUpdated > 0) {
      await sendSuccessNotification(totalUpdated, uniqueUserIds.length)
    }

    return NextResponse.json({
      success: successCount === uniqueUserIds.length,
      message: `Marked ${totalUpdated} overdue payments for ${successCount}/${uniqueUserIds.length} users`,
      duration: `${duration}ms`,
      results,
      nextRun: getNextRunTime()
    })
  } catch (error) {
    console.error('❌ Cron job failed:', error)

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

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const apiKey = body.apiKey || request.headers.get('x-api-key')

    if (apiKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔧 Manual mark overdue triggered')

    const db = getSupabaseClient()

    const { data: usersData, error: usersError } = await db
      .from('payment_schedules')
      .select('user_id')
      .eq('status', 'pending')

    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`)
    }

    const uniqueUserIds = [...new Set((usersData || []).map(u => u.user_id))]

    const results = []
    let totalUpdated = 0

    for (const userId of uniqueUserIds) {
      const result = await batchMarkOverduePaymentSchedules(db, userId)
      results.push({
        user_id: userId,
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

function getNextRunTime(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}
