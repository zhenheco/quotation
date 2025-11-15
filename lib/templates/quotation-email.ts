import { safeToLocaleString } from '@/lib/utils/formatters'

export interface QuotationEmailData {
  locale: 'zh' | 'en'
  quotationNumber: string
  customerName: string
  issueDate: string
  validUntil: string
  currency: string
  total: number
  viewUrl: string
  companyName: string
  items?: Array<{
    description: string
    quantity: number
    unitPrice: number
    amount: number
  }>
}

export function generateQuotationEmailHTML(data: QuotationEmailData): string {
  const {
    locale,
    quotationNumber,
    customerName,
    issueDate,
    validUntil,
    currency,
    total,
    viewUrl,
    companyName,
    items,
  } = data

  const isZh = locale === 'zh'

  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background-color: #4f46e5;
        color: white;
        padding: 20px;
        border-radius: 8px 8px 0 0;
        text-align: center;
      }
      .content {
        background-color: #f9fafb;
        padding: 30px;
        border: 1px solid #e5e7eb;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        margin: 10px 0;
        padding: 10px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .info-label {
        font-weight: 600;
        color: #6b7280;
      }
      .info-value {
        color: #111827;
      }
      .total {
        background-color: #fff;
        padding: 15px;
        margin: 20px 0;
        border-radius: 8px;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        color: #4f46e5;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #4f46e5;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        margin: 10px 5px;
        font-weight: 600;
      }
      .button:hover {
        background-color: #4338ca;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        color: #6b7280;
        font-size: 14px;
      }
      .items-table {
        width: 100%;
        margin: 20px 0;
        border-collapse: collapse;
        background-color: white;
      }
      .items-table th,
      .items-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
      }
      .items-table th {
        background-color: #f3f4f6;
        font-weight: 600;
        color: #374151;
      }
    </style>
  `

  const header = `
    <div class="header">
      <h1>${isZh ? '報價單' : 'Quotation'}</h1>
      <p style="margin: 0; font-size: 18px;">${quotationNumber}</p>
    </div>
  `

  const greeting = `
    <p>${isZh ? '親愛的' : 'Dear'} ${customerName}${isZh ? '，' : ','}</p>
    <p>${isZh ? '感謝您的詢價。以下是您的報價單詳情：' : 'Thank you for your inquiry. Please find your quotation details below:'}</p>
  `

  const info = `
    <div class="info-row">
      <span class="info-label">${isZh ? '報價單編號' : 'Quotation Number'}:</span>
      <span class="info-value">${quotationNumber}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${isZh ? '發單日期' : 'Issue Date'}:</span>
      <span class="info-value">${issueDate}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${isZh ? '有效期限' : 'Valid Until'}:</span>
      <span class="info-value">${validUntil}</span>
    </div>
  `

  const itemsTable = items && items.length > 0 ? `
    <table class="items-table">
      <thead>
        <tr>
          <th>${isZh ? '項目' : 'Item'}</th>
          <th>${isZh ? '數量' : 'Quantity'}</th>
          <th>${isZh ? '單價' : 'Unit Price'}</th>
          <th>${isZh ? '金額' : 'Amount'}</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${currency} ${safeToLocaleString(item.unitPrice)}</td>
            <td>${currency} ${safeToLocaleString(item.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''

  const totalSection = `
    <div class="total">
      ${isZh ? '總金額' : 'Total Amount'}: ${currency} ${safeToLocaleString(total)}
    </div>
  `

  const buttons = `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${viewUrl}" class="button">${isZh ? '查看完整報價單' : 'View Full Quotation'}</a>
    </div>
    <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 10px;">
      ${isZh ? '您可以在查看頁面使用瀏覽器的「列印」功能儲存為 PDF' : 'You can use your browser\'s "Print" function to save as PDF'}
    </p>
  `

  const footer = `
    <div class="footer">
      <p>${isZh ? '如有任何問題，歡迎隨時與我們聯繫。' : 'If you have any questions, please feel free to contact us.'}</p>
      <p>${isZh ? '祝商祺，' : 'Best regards,'}</p>
      <p><strong>${companyName}</strong></p>
    </div>
  `

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isZh ? '報價單' : 'Quotation'} - ${quotationNumber}</title>
      ${styles}
    </head>
    <body>
      ${header}
      <div class="content">
        ${greeting}
        ${info}
        ${itemsTable}
        ${totalSection}
        ${buttons}
        ${footer}
      </div>
    </body>
    </html>
  `
}

export function generateDefaultEmailSubject(quotationNumber: string, locale: 'zh' | 'en'): string {
  return locale === 'zh'
    ? `報價單 ${quotationNumber}`
    : `Quotation ${quotationNumber}`
}

export function generateDefaultEmailContent(data: QuotationEmailData, customMessage?: string): string {
  if (customMessage) {
    return customMessage
  }

  return generateQuotationEmailHTML(data)
}
