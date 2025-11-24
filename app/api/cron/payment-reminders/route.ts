import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getPaymentReminders } from '@/lib/dal/payments'
import { getD1Client, type D1Client } from '@/lib/db/d1-client'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { headers } from 'next/headers'
import { emailService } from '@/lib/services/email'
import {
  generatePaymentReminderEmailHTML,
  generatePaymentReminderSubject,
  type PaymentReminderEmailData
} from '@/lib/templates/payment-reminder-email'

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
        text: `⚠️ Payment Reminders Failed`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Payment Reminders Failed*\n\`\`\`${getErrorMessage(error)}\`\`\``
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
async function sendSuccessNotification(totalSent: number, userCount: number) {
  // 只在設定了通知 URL 且為生產環境時發送成功通知
  if (process.env.NODE_ENV !== 'production') return

  const webhookUrl = process.env.SUCCESS_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `✅ Sent ${totalSent} payment reminders to ${userCount} customers`
      })
    })
  } catch (error) {
    console.error('Failed to send success notification:', error)
  }
}

// 查詢客戶 email 地址
async function getCustomerEmail(
  db: D1Client,
  customerId: string
): Promise<string | null> {
  const customers = await db.query<{ email: string }>(
    'SELECT email FROM customers WHERE id = ? LIMIT 1',
    [customerId]
  )

  return customers.length > 0 ? customers[0].email : null
}

export async function GET() {
  const { env } = await getCloudflareContext()

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

    console.log('🕒 Starting scheduled payment reminders job...')
    const startTime = Date.now()

    const db = getD1Client(env)

    // 查詢所有有活躍合約的使用者
    const users = await db.query<{ user_id: string }>(
      `SELECT DISTINCT user_id
       FROM customer_contracts
       WHERE status = 'active'`
    )

    console.log(`📊 Found ${users.length} users with active contracts`)

    // 為每個使用者查詢並發送提醒
    const results = []
    let totalSent = 0
    let totalFailed = 0

    const companyName = process.env.COMPANY_NAME || 'Your Company'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    for (const user of users) {
      try {
        // 取得即將到期和逾期的收款提醒（30天內）
        const reminders = await getPaymentReminders(db, user.user_id, 30)

        // 只發送逾期、今日到期和即將到期（7天內）的提醒
        const urgentReminders = reminders.filter(
          r => r.collection_status === 'overdue' ||
               r.collection_status === 'due_today' ||
               r.collection_status === 'due_soon'
        )

        if (urgentReminders.length === 0) {
          results.push({
            user_id: user.user_id,
            reminders_sent: 0,
            message: 'No urgent reminders'
          })
          continue
        }

        console.log(
          `📧 Sending ${urgentReminders.length} reminders for user ${user.user_id}`
        )

        // 為每個提醒發送 email
        const emailResults = []
        for (const reminder of urgentReminders) {
          try {
            // 查詢客戶 email
            const customerEmail = await getCustomerEmail(db, reminder.customer_id)

            if (!customerEmail) {
              console.warn(
                `⚠️  Customer ${reminder.customer_id} has no email address`
              )
              emailResults.push({
                contract_id: reminder.contract_id,
                success: false,
                error: 'No email address'
              })
              continue
            }

            // 準備 email 資料
            const emailData: PaymentReminderEmailData = {
              locale: 'zh', // 可以從使用者設定讀取
              customerName: reminder.customer_name,
              contractNumber: reminder.contract_number,
              contractTitle: reminder.contract_title,
              dueDate: new Date(reminder.next_collection_date).toLocaleDateString('zh-TW'),
              amount: reminder.next_collection_amount,
              currency: reminder.currency,
              daysUntilDue: reminder.days_until_collection,
              status: reminder.collection_status,
              companyName,
              viewUrl: appUrl ? `${appUrl}/zh/contracts/${reminder.contract_id}` : undefined
            }

            // 生成 email HTML
            const emailHTML = generatePaymentReminderEmailHTML(emailData)
            const subject = generatePaymentReminderSubject(
              reminder.contract_number,
              reminder.collection_status,
              'zh'
            )

            // 發送 email
            const emailResult = await emailService.sendEmail({
              to: customerEmail,
              subject,
              html: emailHTML
            })

            if (emailResult.success) {
              totalSent++
              console.log(
                `✅ Sent reminder for contract ${reminder.contract_number} to ${customerEmail}`
              )
            } else {
              totalFailed++
              console.error(
                `❌ Failed to send reminder for contract ${reminder.contract_number}: ${emailResult.error}`
              )
            }

            emailResults.push({
              contract_id: reminder.contract_id,
              contract_number: reminder.contract_number,
              customer_email: customerEmail,
              success: emailResult.success,
              error: emailResult.error
            })

            // 延遲 100ms 避免發送過快
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (emailError) {
            totalFailed++
            console.error(
              `❌ Error sending reminder for contract ${reminder.contract_id}:`,
              emailError
            )
            emailResults.push({
              contract_id: reminder.contract_id,
              success: false,
              error: getErrorMessage(emailError)
            })
          }
        }

        results.push({
          user_id: user.user_id,
          reminders_sent: emailResults.filter(r => r.success).length,
          reminders_failed: emailResults.filter(r => !r.success).length,
          details: emailResults
        })
      } catch (error) {
        totalFailed++
        console.error(`❌ Failed to process user ${user.user_id}:`, error)
        results.push({
          user_id: user.user_id,
          reminders_sent: 0,
          reminders_failed: 0,
          error: getErrorMessage(error)
        })
      }
    }

    const duration = Date.now() - startTime

    // 如果有任何失敗，發送錯誤通知
    if (totalFailed > 0) {
      await sendErrorNotification(
        new Error(`Failed to send ${totalFailed} payment reminders`)
      )
    } else if (totalSent > 0) {
      // 全部成功且有發送，發送成功通知（僅生產環境）
      await sendSuccessNotification(totalSent, users.length)
    }

    // 返回詳細結果
    return NextResponse.json({
      success: totalFailed === 0,
      message: `Sent ${totalSent} reminders, ${totalFailed} failed`,
      duration: `${duration}ms`,
      statistics: {
        total_users: users.length,
        total_sent: totalSent,
        total_failed: totalFailed
      },
      results,
      nextRun: getNextRunTime()
    })
  } catch (error) {
    console.error('❌ Cron job failed:', error)

    // 發送錯誤通知
    await sendErrorNotification(error as Error)

    return NextResponse.json(
      {
        error: 'Payment reminders failed',
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

    console.log('🔧 Manual payment reminders triggered')

    const db = getD1Client(env)

    // 查詢指定使用者（如果提供）或所有使用者
    const userId = body.userId as string | undefined
    const users = userId
      ? [{ user_id: userId }]
      : await db.query<{ user_id: string }>(
          `SELECT DISTINCT user_id
           FROM customer_contracts
           WHERE status = 'active'`
        )

    let totalSent = 0
    const companyName = process.env.COMPANY_NAME || 'Your Company'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    for (const user of users) {
      const reminders = await getPaymentReminders(db, user.user_id, 30)
      const urgentReminders = reminders.filter(
        r => r.collection_status === 'overdue' ||
             r.collection_status === 'due_today' ||
             r.collection_status === 'due_soon'
      )

      for (const reminder of urgentReminders) {
        const customerEmail = await getCustomerEmail(db, reminder.customer_id)
        if (!customerEmail) continue

        const emailData: PaymentReminderEmailData = {
          locale: 'zh',
          customerName: reminder.customer_name,
          contractNumber: reminder.contract_number,
          contractTitle: reminder.contract_title,
          dueDate: new Date(reminder.next_collection_date).toLocaleDateString('zh-TW'),
          amount: reminder.next_collection_amount,
          currency: reminder.currency,
          daysUntilDue: reminder.days_until_collection,
          status: reminder.collection_status,
          companyName,
          viewUrl: appUrl ? `${appUrl}/zh/contracts/${reminder.contract_id}` : undefined
        }

        const emailHTML = generatePaymentReminderEmailHTML(emailData)
        const subject = generatePaymentReminderSubject(
          reminder.contract_number,
          reminder.collection_status,
          'zh'
        )

        const emailResult = await emailService.sendEmail({
          to: customerEmail,
          subject,
          html: emailHTML
        })

        if (emailResult.success) {
          totalSent++
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return NextResponse.json({
      success: true,
      message: `Manual payment reminders completed: ${totalSent} emails sent`,
      total_sent: totalSent
    })
  } catch (error) {
    console.error('Manual payment reminders failed:', error)
    return NextResponse.json(
      { error: 'Manual payment reminders failed', message: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// 計算下次執行時間（每日 09:00 UTC = 17:00 台北時間）
function getNextRunTime(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(1, 0, 0, 0) // 01:00 UTC = 09:00 台北時間
  return tomorrow.toISOString()
}
