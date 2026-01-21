import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getPaymentReminders } from '@/lib/dal/payments'
import { getSupabaseClient, type SupabaseClient } from '@/lib/db/supabase-client'
import { headers } from 'next/headers'
import { emailService } from '@/lib/services/email'
import {
  generatePaymentReminderEmailHTML,
  generatePaymentReminderSubject,
  type PaymentReminderEmailData
} from '@/lib/templates/payment-reminder-email'

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

async function sendSuccessNotification(totalSent: number, userCount: number) {
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

async function getCustomerEmail(
  db: SupabaseClient,
  customerId: string
): Promise<string | null> {
  const { data, error } = await db
    .from('customers')
    .select('email')
    .eq('id', customerId)
    .single()

  if (error || !data) {
    return null
  }

  return data.email
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

    console.log('🕒 Starting scheduled payment reminders job...')
    const startTime = Date.now()

    const db = getSupabaseClient()

    const { data: usersData, error: usersError } = await db
      .from('customer_contracts')
      .select('user_id')
      .eq('status', 'active')

    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`)
    }

    const uniqueUserIds = [...new Set((usersData || []).map(u => u.user_id))]
    console.log(`📊 Found ${uniqueUserIds.length} users with active contracts`)

    const results = []
    let totalSent = 0
    let totalFailed = 0

    const companyName = process.env.COMPANY_NAME || 'Your Company'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    for (const userId of uniqueUserIds) {
      try {
        const reminders = await getPaymentReminders(db, userId, 30)

        const urgentReminders = reminders.filter(
          r => r.collection_status === 'overdue' ||
               r.collection_status === 'due_today' ||
               r.collection_status === 'due_soon'
        )

        if (urgentReminders.length === 0) {
          results.push({
            user_id: userId,
            reminders_sent: 0,
            message: 'No urgent reminders'
          })
          continue
        }

        console.log(
          `📧 Sending ${urgentReminders.length} reminders for user ${userId}`
        )

        const emailResults = []
        for (const reminder of urgentReminders) {
          try {
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
              viewUrl: appUrl ? `${appUrl}/contracts/${reminder.contract_id}` : undefined
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
          user_id: userId,
          reminders_sent: emailResults.filter(r => r.success).length,
          reminders_failed: emailResults.filter(r => !r.success).length,
          details: emailResults
        })
      } catch (error) {
        totalFailed++
        console.error(`❌ Failed to process user ${userId}:`, error)
        results.push({
          user_id: userId,
          reminders_sent: 0,
          reminders_failed: 0,
          error: getErrorMessage(error)
        })
      }
    }

    const duration = Date.now() - startTime

    if (totalFailed > 0) {
      await sendErrorNotification(
        new Error(`Failed to send ${totalFailed} payment reminders`)
      )
    } else if (totalSent > 0) {
      await sendSuccessNotification(totalSent, uniqueUserIds.length)
    }

    return NextResponse.json({
      success: totalFailed === 0,
      message: `Sent ${totalSent} reminders, ${totalFailed} failed`,
      duration: `${duration}ms`,
      statistics: {
        total_users: uniqueUserIds.length,
        total_sent: totalSent,
        total_failed: totalFailed
      },
      results,
      nextRun: getNextRunTime()
    })
  } catch (error) {
    console.error('❌ Cron job failed:', error)

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

    console.log('🔧 Manual payment reminders triggered')

    const db = getSupabaseClient()

    const userId = body.userId as string | undefined
    let userIds: string[] = []

    if (userId) {
      userIds = [userId]
    } else {
      const { data: usersData, error: usersError } = await db
        .from('customer_contracts')
        .select('user_id')
        .eq('status', 'active')

      if (usersError) {
        throw new Error(`Failed to get users: ${usersError.message}`)
      }

      userIds = [...new Set((usersData || []).map(u => u.user_id))]
    }

    let totalSent = 0
    const companyName = process.env.COMPANY_NAME || 'Your Company'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    for (const uid of userIds) {
      const reminders = await getPaymentReminders(db, uid, 30)
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
          viewUrl: appUrl ? `${appUrl}/contracts/${reminder.contract_id}` : undefined
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

function getNextRunTime(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(1, 0, 0, 0)
  return tomorrow.toISOString()
}
