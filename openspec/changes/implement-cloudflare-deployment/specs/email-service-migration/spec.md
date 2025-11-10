# Email Service Migration

從 Nodemailer + Gmail SMTP 遷移到 Resend API，提供專業的報價單郵件服務。

---

## ADDED Requirements

### Requirement: 使用 Resend API 寄送報價單郵件

系統 MUST 使用 Resend API 取代 Nodemailer 寄送報價單郵件。

#### Scenario: 成功寄送報價單郵件

**Given** 報價單已建立，需要寄送給客戶
**When** 呼叫 `sendQuotationEmail(recipientEmail, quotation)`
**Then** 系統應該：
- 使用 Resend API 寄送郵件（`POST https://api.resend.com/emails`）
- 設定 `Authorization: Bearer ${RESEND_API_KEY}`
- 郵件內容包含：報價單編號、客戶資訊、產品列表、總金額
- 使用專業的 HTML 郵件模板（`renderQuotationEmail(quotation)`）
- 回傳 Resend 的 response（包含 `message_id`）
- 追蹤寄送狀態（使用 Workers Analytics）

#### Scenario: 郵件寄送失敗重試

**Given** Resend API 回傳錯誤（如網路問題、API 限制）
**When** 郵件寄送失敗
**Then** 系統應該：
- 記錄錯誤日誌（包含 quotation ID 和錯誤訊息）
- 追蹤失敗事件（`analytics.trackEmailSent(quotationId, 'failed')`）
- 如果使用 Queue，允許自動重試（最多 3 次）
- 如果仍然失敗，通知管理員

#### Scenario: 驗證郵件格式和內容

**Given** 需要寄送報價單郵件
**When** 準備郵件內容
**Then** 系統應該：
- 使用公司名稱作為寄件人（`from: "quotations@yourdomain.com"`）
- 設定清晰的主旨（`subject: "報價單 ${quotation.quotation_number}"`）
- 包含完整的報價單資訊：
  - 報價單編號
  - 客戶名稱和聯絡資訊
  - 產品列表（名稱、數量、單價、小計）
  - 總金額（含幣別）
  - 有效期限
- 使用響應式 HTML 模板（手機和桌面都能正常顯示）

---

### Requirement: Resend API Key 管理

系統 MUST 安全管理 Resend API Key。

#### Scenario: 在 Cloudflare Secrets 儲存 API Key

**Given** 需要使用 Resend API
**When** 配置環境變數
**Then** 系統應該：
- 使用 `wrangler secret put RESEND_API_KEY --name quotation-system` 設定
- 不在程式碼或配置檔案中明文儲存 API Key
- 在 Worker runtime 中透過 `process.env.RESEND_API_KEY` 讀取

#### Scenario: 本地開發環境設定

**Given** 開發者需要在本地測試郵件寄送
**When** 使用 `.dev.vars`
**Then** 系統應該：
- 在 `.dev.vars` 中設定 `RESEND_API_KEY=re_...`
- 確保 `.dev.vars` 已加入 `.gitignore`
- 本地執行時可正常寄送測試郵件

---

### Requirement: 郵件模板渲染

系統 MUST 提供專業的 HTML 郵件模板。

#### Scenario: 渲染報價單郵件 HTML

**Given** 需要寄送報價單
**When** 呼叫 `renderQuotationEmail(quotation)`
**Then** 系統應該：
- 使用 React Email 或純 HTML 模板
- 包含公司 Logo 和品牌顏色
- 清晰展示報價單資訊
- 使用響應式設計（適配手機和桌面）
- 包含聯絡資訊和免責聲明

#### Scenario: 支援多語系郵件

**Given** 系統支援多語系（繁體中文、英文）
**When** 寄送郵件給不同語系的客戶
**Then** 系統應該：
- 根據客戶的語系偏好選擇郵件模板語言
- 郵件內容（主旨、正文、產品描述）使用對應語系
- 保持一致的格式和排版

---

### Requirement: 郵件寄送監控

系統 MUST 追蹤郵件寄送狀態和統計數據。

#### Scenario: 追蹤郵件寄送成功率

**Given** 系統每日寄送多封報價單郵件
**When** 使用 Workers Analytics
**Then** 系統應該：
- 記錄每次郵件寄送事件（成功/失敗）
- 在 Cloudflare Dashboard 查看寄送統計
- 追蹤寄送成功率（目標 > 95%）
- 追蹤失敗原因（如 API 錯誤、無效 Email）

#### Scenario: Resend Dashboard 監控

**Given** 需要查看詳細的郵件寄送記錄
**When** 前往 Resend Dashboard
**Then** 系統應該：
- 查看所有已寄送的郵件
- 確認郵件狀態（已寄送、已開啟、點擊連結）
- 查看退信原因（如 Email 不存在）
- 下載寄送報告

---

## REMOVED Requirements

### Requirement: Nodemailer 寄送郵件

~~系統使用 Nodemailer + Gmail SMTP 寄送報價單郵件~~

**理由**：
1. Gmail SMTP 有每日寄送限制（100 封）
2. 需要管理 Gmail App Password，安全性較低
3. 郵件容易被標記為垃圾郵件
4. 無法追蹤郵件狀態（開啟率、點擊率）

**移除的檔案和程式碼**：
- 刪除或註解 `lib/services/email.ts` 中的 Nodemailer 程式碼
- 移除環境變數：`GMAIL_USER`、`GMAIL_APP_PASSWORD`

---

## Implementation Notes

### Resend 服務建立

建立 `lib/services/resend.ts`：

```typescript
export async function sendQuotationEmail(to: string, quotation: Quotation) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'quotations@yourdomain.com',
      to,
      subject: `報價單 ${quotation.quotation_number}`,
      html: renderQuotationEmail(quotation),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return response.json()
}
```

### 郵件模板

建立 `lib/templates/quotation-email.tsx`（使用 React Email 或純 HTML）：

```typescript
export function renderQuotationEmail(quotation: Quotation): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>報價單 ${quotation.quotation_number}</title>
      </head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>報價單 ${quotation.quotation_number}</h1>

        <h2>客戶資訊</h2>
        <p>${quotation.customer.name}</p>

        <h2>產品列表</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${quotation.items.map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.quantity}</td>
              <td>${item.unit_price}</td>
              <td>${item.subtotal}</td>
            </tr>
          `).join('')}
        </table>

        <h2>總金額</h2>
        <p style="font-size: 24px; font-weight: bold;">
          ${quotation.total} ${quotation.currency}
        </p>

        <p>有效期限：${quotation.valid_until}</p>
      </body>
    </html>
  `
}
```

### 在 API 中使用

修改報價單建立 API：

```typescript
// app/api/quotations/route.ts
import { sendQuotationEmail } from '@/lib/services/resend'
import { Analytics } from '@/lib/cloudflare/analytics'

export async function POST(request: Request) {
  // 建立報價單...
  const quotation = await createQuotation(data)

  // 寄送郵件
  try {
    await sendQuotationEmail(customer.email, quotation)
    analytics.trackEmailSent(quotation.id, 'success')
  } catch (error) {
    console.error('Failed to send email:', error)
    analytics.trackEmailSent(quotation.id, 'failed')
  }

  return Response.json(quotation)
}
```

### Resend 免費方案限制

- 每月 3000 封郵件
- 每日 100 封郵件
- 單次寄送最多 50 位收件人

### 驗證方式

- 測試寄送報價單郵件到真實 Email
- 檢查收件匣確認郵件送達
- 驗證郵件格式和內容正確
- 在 Resend Dashboard 查看寄送記錄
- 在 Workers Analytics 查看寄送統計
