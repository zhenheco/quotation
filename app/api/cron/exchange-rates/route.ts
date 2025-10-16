import { NextResponse } from 'next/server'
import { syncRatesToDatabase, SUPPORTED_CURRENCIES } from '@/lib/services/exchange-rate-zeabur'
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
        text: `⚠️ Exchange Rate Sync Failed`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Exchange Rate Sync Failed*\n\`\`\`${error.message}\`\`\``
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
async function sendSuccessNotification(syncedCount: number) {
  // 只在設定了通知 URL 且為生產環境時發送成功通知
  if (process.env.NODE_ENV !== 'production') return

  const webhookUrl = process.env.SUCCESS_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `✅ Exchange rates synced successfully (${syncedCount} currencies)`
      })
    })
  } catch (error) {
    console.error('Failed to send success notification:', error)
  }
}

export async function GET(request: Request) {
  try {
    // 驗證請求來源 (Vercel Cron 會帶上特殊的 header)
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // 如果設定了 CRON_SECRET，則進行驗證
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🕒 Starting scheduled exchange rate sync...')
    const startTime = Date.now()

    // 同步所有支援的基準貨幣
    const results = []
    let totalSynced = 0

    for (const baseCurrency of SUPPORTED_CURRENCIES) {
      console.log(`📊 Syncing rates for base currency: ${baseCurrency}`)

      const success = await syncRatesToDatabase(baseCurrency)

      results.push({
        currency: baseCurrency,
        success,
        timestamp: new Date().toISOString()
      })

      if (success) {
        totalSynced++
      }
    }

    const duration = Date.now() - startTime

    // 如果有任何失敗，發送錯誤通知
    if (totalSynced < SUPPORTED_CURRENCIES.length) {
      const failedCurrencies = results
        .filter(r => !r.success)
        .map(r => r.currency)
        .join(', ')

      await sendErrorNotification(
        new Error(`Failed to sync rates for: ${failedCurrencies}`)
      )
    } else {
      // 全部成功，發送成功通知（僅生產環境）
      await sendSuccessNotification(totalSynced)
    }

    // 返回詳細結果
    return NextResponse.json({
      success: totalSynced === SUPPORTED_CURRENCIES.length,
      message: `Synced ${totalSynced} out of ${SUPPORTED_CURRENCIES.length} currencies`,
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
        error: 'Exchange rate sync failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 手動觸發端點（用於測試）
export async function POST(request: Request) {
  try {
    // 驗證請求（可以用 API key 或其他方式）
    const body = await request.json()
    const apiKey = body.apiKey || request.headers.get('x-api-key')

    if (apiKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔧 Manual exchange rate sync triggered')

    // 執行同步
    const results = []
    for (const baseCurrency of SUPPORTED_CURRENCIES) {
      const success = await syncRatesToDatabase(baseCurrency)
      results.push({ currency: baseCurrency, success })
    }

    return NextResponse.json({
      success: true,
      message: 'Manual sync completed',
      results
    })
  } catch (error) {
    console.error('Manual sync failed:', error)
    return NextResponse.json(
      { error: 'Manual sync failed' },
      { status: 500 }
    )
  }
}

// 計算下次執行時間
function getNextRunTime(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}