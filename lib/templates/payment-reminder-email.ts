import { safeToLocaleString } from '@/lib/utils/formatters'

export interface PaymentReminderEmailData {
  locale: 'zh' | 'en'
  customerName: string
  contractNumber: string
  contractTitle: string
  dueDate: string
  amount: number
  currency: string
  daysUntilDue: number
  status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming'
  companyName: string
  viewUrl?: string
}

function getStatusText(status: string, locale: 'zh' | 'en'): string {
  const isZh = locale === 'zh'

  switch (status) {
    case 'overdue':
      return isZh ? '已逾期' : 'Overdue'
    case 'due_today':
      return isZh ? '今日到期' : 'Due Today'
    case 'due_soon':
      return isZh ? '即將到期' : 'Due Soon'
    case 'upcoming':
      return isZh ? '即將到來' : 'Upcoming'
    default:
      return ''
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'overdue':
      return '#dc2626'
    case 'due_today':
      return '#ea580c'
    case 'due_soon':
      return '#f59e0b'
    case 'upcoming':
      return '#10b981'
    default:
      return '#6b7280'
  }
}

export function generatePaymentReminderEmailHTML(data: PaymentReminderEmailData): string {
  const {
    locale,
    customerName,
    contractNumber,
    contractTitle,
    dueDate,
    amount,
    currency,
    daysUntilDue,
    status,
    companyName,
    viewUrl,
  } = data

  const isZh = locale === 'zh'
  const statusText = getStatusText(status, locale)
  const statusColor = getStatusColor(status)

  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f9fafb;
      }
      .email-container {
        background-color: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .header {
        background-color: ${statusColor};
        color: white;
        padding: 30px 20px;
        text-align: center;
      }
      .header h1 {
        margin: 0 0 10px 0;
        font-size: 24px;
      }
      .status-badge {
        display: inline-block;
        padding: 6px 16px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
      }
      .content {
        padding: 30px;
      }
      .greeting {
        font-size: 16px;
        margin-bottom: 20px;
      }
      .info-section {
        background-color: #f9fafb;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        margin: 12px 0;
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .info-row:last-child {
        border-bottom: none;
      }
      .info-label {
        font-weight: 600;
        color: #6b7280;
      }
      .info-value {
        color: #111827;
        text-align: right;
      }
      .amount-highlight {
        background-color: #fff;
        padding: 20px;
        margin: 20px 0;
        border-radius: 8px;
        border: 2px solid ${statusColor};
        text-align: center;
      }
      .amount-label {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 8px;
      }
      .amount-value {
        font-size: 32px;
        font-weight: bold;
        color: ${statusColor};
        margin: 0;
      }
      .days-info {
        margin-top: 10px;
        font-size: 14px;
        color: #6b7280;
      }
      .button {
        display: inline-block;
        padding: 14px 28px;
        background-color: ${statusColor};
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        text-align: center;
        margin: 10px 0;
      }
      .button:hover {
        opacity: 0.9;
      }
      .action-section {
        text-align: center;
        margin: 30px 0;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        color: #6b7280;
        font-size: 14px;
      }
      .urgent-note {
        background-color: #fef2f2;
        border-left: 4px solid #dc2626;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .urgent-note p {
        margin: 0;
        color: #991b1b;
      }
    </style>
  `

  const header = `
    <div class="header">
      <h1>${isZh ? '收款提醒' : 'Payment Reminder'}</h1>
      <div class="status-badge">${statusText}</div>
    </div>
  `

  const greeting = `
    <div class="greeting">
      <p>${isZh ? '親愛的' : 'Dear'} ${customerName}${isZh ? '，' : ','}</p>
      <p>${isZh
        ? '這是一封關於您合約付款的提醒通知。'
        : 'This is a reminder regarding your contract payment.'}</p>
    </div>
  `

  const urgentNote = status === 'overdue' ? `
    <div class="urgent-note">
      <p><strong>⚠️ ${isZh ? '重要提醒' : 'Important Notice'}</strong></p>
      <p>${isZh
        ? '此款項已逾期，請盡快處理以避免影響後續服務。'
        : 'This payment is overdue. Please process it as soon as possible to avoid service interruptions.'}</p>
    </div>
  ` : status === 'due_today' ? `
    <div class="urgent-note">
      <p><strong>📅 ${isZh ? '今日到期' : 'Due Today'}</strong></p>
      <p>${isZh
        ? '此款項於今日到期，請確認是否已完成付款。'
        : 'This payment is due today. Please confirm if payment has been processed.'}</p>
    </div>
  ` : ''

  const contractInfo = `
    <div class="info-section">
      <div class="info-row">
        <span class="info-label">${isZh ? '合約編號' : 'Contract Number'}:</span>
        <span class="info-value">${contractNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isZh ? '合約名稱' : 'Contract Title'}:</span>
        <span class="info-value">${contractTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isZh ? '到期日期' : 'Due Date'}:</span>
        <span class="info-value">${dueDate}</span>
      </div>
    </div>
  `

  const amountSection = `
    <div class="amount-highlight">
      <div class="amount-label">${isZh ? '應收金額' : 'Amount Due'}</div>
      <p class="amount-value">${currency} ${safeToLocaleString(amount)}</p>
      <div class="days-info">
        ${daysUntilDue < 0
          ? `${isZh ? '已逾期' : 'Overdue by'} ${Math.abs(daysUntilDue)} ${isZh ? '天' : 'days'}`
          : daysUntilDue === 0
            ? `${isZh ? '今日到期' : 'Due today'}`
            : `${isZh ? '距離到期還有' : 'Due in'} ${daysUntilDue} ${isZh ? '天' : 'days'}`
        }
      </div>
    </div>
  `

  const actionButtons = viewUrl ? `
    <div class="action-section">
      <a href="${viewUrl}" class="button">${isZh ? '查看合約詳情' : 'View Contract Details'}</a>
      <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
        ${isZh
          ? '如已完成付款，請忽略此提醒。'
          : 'If payment has been processed, please disregard this reminder.'}
      </p>
    </div>
  ` : `
    <div class="action-section">
      <p style="color: #6b7280; font-size: 14px;">
        ${isZh
          ? '如已完成付款，請忽略此提醒。如有任何問題，請與我們聯繫。'
          : 'If payment has been processed, please disregard this reminder. If you have any questions, please contact us.'}
      </p>
    </div>
  `

  const footer = `
    <div class="footer">
      <p>${isZh ? '感謝您的配合與支持。' : 'Thank you for your cooperation and support.'}</p>
      <p>${isZh ? '如有任何問題，歡迎隨時與我們聯繫。' : 'If you have any questions, please feel free to contact us.'}</p>
      <p style="margin-top: 15px;">${isZh ? '祝商祺，' : 'Best regards,'}</p>
      <p><strong>${companyName}</strong></p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
        ${isZh
          ? '這是一封系統自動發送的提醒郵件，請勿直接回覆。'
          : 'This is an automated reminder email. Please do not reply directly.'}
      </p>
    </div>
  `

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isZh ? '收款提醒' : 'Payment Reminder'} - ${contractNumber}</title>
      ${styles}
    </head>
    <body>
      <div class="email-container">
        ${header}
        <div class="content">
          ${greeting}
          ${urgentNote}
          ${contractInfo}
          ${amountSection}
          ${actionButtons}
          ${footer}
        </div>
      </div>
    </body>
    </html>
  `
}

export function generatePaymentReminderSubject(
  contractNumber: string,
  status: string,
  locale: 'zh' | 'en'
): string {
  const isZh = locale === 'zh'
  const statusText = getStatusText(status, locale)

  if (isZh) {
    return `【${statusText}】合約 ${contractNumber} 收款提醒`
  }

  return `[${statusText}] Payment Reminder for Contract ${contractNumber}`
}
