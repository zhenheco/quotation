# API 快速參考

> 一頁式速查表，適合貼在螢幕旁邊

**系統版本**: v0.1.0 | **建立日期**: 2025-10-24

---

## 基礎資訊

**Base URL**: `/api`
**認證方式**: Supabase Auth (自動)
**Content-Type**: `application/json`
**回應格式**: JSON

### HTTP 狀態碼
```
200 OK              → 成功
201 Created         → 建立成功
204 No Content      → 刪除成功
400 Bad Request     → 參數錯誤
401 Unauthorized    → 未登入
403 Forbidden       → 無權限
404 Not Found       → 找不到資源
429 Too Many Req    → 超過限制
500 Server Error    → 伺服器錯誤
```

---

## 認證 (Auth)

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/auth/callback` | OAuth 回調 |
| GET | `/api/me` | 取得使用者資訊 |
| GET | `/api/user/permissions` | 取得權限 |
| GET | `/api/user/companies` | 取得所屬公司 |

---

## 客戶 (Customers)

| 方法 | 端點 | 說明 | 必填欄位 |
|------|------|------|---------|
| GET | `/api/customers` | 取得客戶清單 | - |
| GET | `/api/customers/{id}` | 取得單一客戶 | - |
| POST | `/api/customers` | 建立客戶 | `name`, `email` |
| PUT | `/api/customers/{id}` | 更新客戶 | - |
| DELETE | `/api/customers/{id}` | 刪除客戶 | - |

**建立客戶範例**:
```json
{
  "name": { "zh": "台灣公司", "en": "Taiwan Company" },
  "email": "contact@example.com",
  "phone": "02-1234-5678",
  "tax_id": "12345678"
}
```

---

## 產品 (Products)

| 方法 | 端點 | 說明 | 必填欄位 |
|------|------|------|---------|
| GET | `/api/products` | 取得產品清單 | - |
| GET | `/api/products/{id}` | 取得單一產品 | - |
| POST | `/api/products` | 建立產品 | `name`, `unit_price`, `currency` |
| PUT | `/api/products/{id}` | 更新產品 | - |
| DELETE | `/api/products/{id}` | 刪除產品 | - |

**建立產品範例**:
```json
{
  "name": { "zh": "筆記型電腦", "en": "Laptop" },
  "unit_price": 30000,
  "currency": "TWD",
  "category": "電腦設備"
}
```

---

## 報價單 (Quotations)

### 基本操作

| 方法 | 端點 | 說明 | 必填欄位 |
|------|------|------|---------|
| GET | `/api/quotations` | 取得報價單清單 | - |
| GET | `/api/quotations/{id}` | 取得單一報價單 | - |
| POST | `/api/quotations` | 建立報價單 | `customer_id`, `issue_date`, `valid_until`, `currency`, `items` |
| PUT | `/api/quotations/{id}` | 更新報價單 | - |
| DELETE | `/api/quotations/{id}` | 刪除報價單 | - |

### 特殊操作

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/quotations/{id}/pdf?locale=zh` | 匯出 PDF |
| POST | `/api/quotations/batch/delete` | 批次刪除 |
| POST | `/api/quotations/batch/export` | 批次匯出 PDF (ZIP) |
| POST | `/api/quotations/batch/status` | 批次更新狀態 |

**建立報價單範例**:
```json
{
  "customer_id": "xxx-xxx-xxx",
  "issue_date": "2025-10-24",
  "valid_until": "2025-11-24",
  "currency": "TWD",
  "subtotal": 30000,
  "tax_rate": 5,
  "tax_amount": 1500,
  "total_amount": 31500,
  "items": [
    {
      "product_id": "yyy-yyy-yyy",
      "quantity": 1,
      "unit_price": 30000,
      "discount": 0,
      "subtotal": 30000
    }
  ]
}
```

**批次刪除範例**:
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

---

## 合約 (Contracts)

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/contracts/from-quotation` | 從報價單建立合約 |
| GET | `/api/contracts/overdue` | 取得逾期合約 |
| GET | `/api/contracts/{id}/payment-progress` | 取得收款進度 |
| GET | `/api/contracts/{id}/next-collection` | 取得下次收款資訊 |

**建立合約範例**:
```json
{
  "quotation_id": "xxx-xxx-xxx",
  "signed_date": "2025-10-24",
  "start_date": "2025-11-01",
  "end_date": "2026-10-31",
  "payment_terms": "monthly"
}
```

---

## 收款 (Payments)

| 方法 | 端點 | 說明 | 查詢參數 |
|------|------|------|---------|
| GET | `/api/payments` | 取得收款清單 | `customer_id`, `status`, `payment_type` |
| POST | `/api/payments` | 記錄收款 | - |
| GET | `/api/payments/unpaid` | 未收款清單 (>30天) | - |
| GET | `/api/payments/collected` | 已收款清單 | - |
| GET | `/api/payments/reminders` | 收款提醒 (未來30天) | - |
| POST | `/api/payments/{id}/mark-overdue` | 標記逾期 | - |

**記錄收款範例**:
```json
{
  "customer_id": "xxx-xxx-xxx",
  "quotation_id": "yyy-yyy-yyy",
  "payment_type": "deposit",
  "payment_date": "2025-10-24",
  "amount": 10000,
  "currency": "TWD",
  "payment_method": "bank_transfer",
  "reference_number": "TXN-123456"
}
```

**付款類型 (payment_type)**:
- `deposit` - 頭款
- `installment` - 期款
- `final` - 尾款
- `full` - 全額付款
- `recurring` - 定期收款

**付款方式 (payment_method)**:
- `bank_transfer` - 銀行轉帳
- `credit_card` - 信用卡
- `check` - 支票
- `cash` - 現金
- `other` - 其他

---

## 匯率 (Exchange Rates)

| 方法 | 端點 | 說明 | 查詢參數 |
|------|------|------|---------|
| GET | `/api/exchange-rates` | 取得匯率 | `base` (預設: TWD) |
| POST | `/api/exchange-rates/sync` | 手動同步匯率 | - |

**取得匯率範例**:
```bash
GET /api/exchange-rates?base=TWD

# 回應
{
  "success": true,
  "base_currency": "TWD",
  "rates": {
    "USD": 0.032,
    "EUR": 0.029,
    "JPY": 4.8,
    "CNY": 0.23
  },
  "timestamp": "2025-10-24T10:00:00Z"
}
```

---

## 公司設定 (Company Settings)

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/company-settings` | 取得公司設定 |
| POST | `/api/company-settings` | 更新公司設定 |

**更新設定範例**:
```json
{
  "company_name_zh": "台灣科技公司",
  "company_name_en": "Taiwan Tech Co.",
  "tax_id": "12345678",
  "phone": "02-1234-5678",
  "email": "info@example.com",
  "default_currency": "TWD",
  "default_tax_rate": 5,
  "default_payment_terms": "monthly",
  "default_payment_day": 5
}
```

---

## 公司管理 (Companies)

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/companies` | 取得公司清單 |
| POST | `/api/companies` | 建立公司 |
| PUT | `/api/companies/{id}` | 更新公司 |
| DELETE | `/api/companies/{id}` | 刪除公司 |
| GET | `/api/companies/{id}/members` | 取得成員清單 |
| POST | `/api/companies/{id}/members` | 新增成員 |
| DELETE | `/api/companies/{id}/members/{userId}` | 移除成員 |

---

## 管理員 (Admin) 🔒

**需要**: 超級管理員權限

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/stats` | 取得系統統計 |
| GET | `/api/admin/companies` | 取得所有公司 |
| PUT | `/api/admin/companies/{id}` | 更新公司 |
| GET | `/api/admin/companies/{id}/members` | 取得公司成員 |
| GET | `/api/admin/users` | 取得所有使用者 |
| POST | `/api/admin/users/{id}/role` | 更新使用者角色 |

---

## 測試端點 (Development Only)

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/seed-test-data` | 生成測試資料 |
| POST | `/api/test-email` | 測試 Email |
| GET | `/api/test-admin` | 測試管理員權限 |

---

## 常用型別

### Customer
```typescript
{
  id: string
  name: { zh: string, en: string }
  email: string
  phone?: string
  address?: { zh: string, en: string }
  tax_id?: string
  contact_person?: { zh: string, en: string }
  created_at: string
  updated_at: string
}
```

### Product
```typescript
{
  id: string
  name: { zh: string, en: string }
  unit_price: number
  currency: string
  description?: { zh: string, en: string }
  category?: string
  cost_price?: number        // 需要權限
  created_at: string
  updated_at: string
}
```

### Quotation
```typescript
{
  id: string
  quotation_number: string   // 自動生成
  customer_id: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes?: string
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'overdue'
  created_at: string
  updated_at: string
}
```

### QuotationItem
```typescript
{
  id: string
  quotation_id: string
  product_id?: string
  quantity: number
  unit_price: number
  discount: number           // 0-100
  subtotal: number
  created_at: string
  updated_at: string
}
```

### Payment
```typescript
{
  id: string
  customer_id: string
  quotation_id?: string
  contract_id?: string
  payment_type: 'deposit' | 'installment' | 'final' | 'full' | 'recurring'
  payment_date: string
  amount: number
  currency: string
  payment_method?: 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other'
  reference_number?: string
  notes?: string
  created_at: string
  updated_at: string
}
```

---

## 錯誤處理

### 錯誤回應格式
```json
{
  "error": "錯誤訊息",
  "message": "詳細說明",
  "errors": {
    "field1": ["錯誤1", "錯誤2"],
    "field2": ["錯誤"]
  }
}
```

### 常見錯誤

**401 Unauthorized**
```json
{ "error": "Unauthorized" }
```
→ 解決: 檢查登入狀態

**403 Forbidden**
```json
{ "error": "Insufficient permissions: resource:action" }
```
→ 解決: 確認使用者權限

**400 Bad Request**
```json
{
  "error": "Validation failed",
  "errors": {
    "email": ["Email 格式不正確"]
  }
}
```
→ 解決: 修正請求資料

**404 Not Found**
```json
{ "error": "Customer not found or unauthorized" }
```
→ 解決: 確認資源 ID 和權限

**429 Too Many Requests**
```json
{ "error": "Too many requests" }
```
→ 解決: 降低請求頻率

---

## 權限檢查

### RBAC 角色

| 角色 | Level | 說明 |
|------|-------|------|
| super_admin | 1 | 超級管理員 (最高權限) |
| company_owner | 2 | 公司負責人 |
| sales_manager | 3 | 業務主管 |
| salesperson | 4 | 業務人員 |
| accountant | 5 | 會計 |

### 權限格式

`resource:action`

**資源 (resource)**:
- `products` - 產品
- `customers` - 客戶
- `quotations` - 報價單
- `contracts` - 合約
- `payments` - 收款
- `company_settings` - 公司設定
- `users` - 使用者

**動作 (action)**:
- `read` - 讀取
- `write` - 寫入 (新增/修改)
- `delete` - 刪除
- `read_cost` - 讀取成本 (產品專用)
- `assign_roles` - 分配角色 (使用者專用)

### 權限範例

```typescript
// 檢查權限
GET /api/user/permissions

// 回應
{
  "user_id": "xxx",
  "role_name": "company_owner",
  "role_level": 2,
  "permissions": [
    "products:read",
    "products:write",
    "products:read_cost",
    "customers:read",
    "customers:write",
    "quotations:read",
    "quotations:write",
    "quotations:delete",
    "payments:read",
    "payments:write",
    "company_settings:write",
    "users:read",
    "users:assign_roles"
  ]
}
```

---

## 速率限制

| 操作類型 | 限制 |
|---------|------|
| 一般 GET 請求 | 300 次/分鐘 |
| POST/PUT 請求 | 60 次/分鐘 |
| 批次操作 | 5 次/分鐘 |
| PDF 匯出 | 10 次/分鐘 |

**超過限制回應**:
```json
{
  "error": "Too many requests",
  "retry_after": 60
}
```

---

## 檔案操作

### 支援的檔案類型

**圖片** (Logo、簽章):
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WebP (`.webp`)
- 最大 5MB

**文件** (合約、收據):
- PDF (`.pdf`)
- 最大 10MB

### 上傳範例

```typescript
const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
})

const { url } = await response.json()
```

---

## 實用工具

### cURL 範例

```bash
# 取得客戶清單
curl -X GET https://your-domain.com/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN"

# 建立客戶
curl -X POST https://your-domain.com/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": {"zh": "台灣公司", "en": "Taiwan Company"},
    "email": "contact@example.com"
  }'

# 匯出報價單 PDF
curl -X GET "https://your-domain.com/api/quotations/{id}/pdf?locale=zh" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o quotation.pdf
```

### JavaScript/TypeScript 範例

```typescript
// 使用 Fetch API
const response = await fetch('/api/customers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: { zh: '台灣公司', en: 'Taiwan Company' },
    email: 'contact@example.com',
  }),
})

if (!response.ok) {
  const error = await response.json()
  console.error('Error:', error.error)
  throw new Error(error.error)
}

const customer = await response.json()
console.log('Created:', customer)
```

---

## 環境變數

```bash
# 必要
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# 選用
EXCHANGE_RATE_API_KEY=...
RESEND_API_KEY=...
CRON_SECRET=...
```

---

## 相關文件

- 📚 **完整 API 文件**: [API_ARCHITECTURE.md](./API_ARCHITECTURE.md)
- 🚀 **前端整合指南**: [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)
- 🗺️ **開發路線圖**: [/ROADMAP.md](../ROADMAP.md)
- 📝 **變更日誌**: [/CHANGELOG.md](../CHANGELOG.md)

---

**列印友好版**: 建議以 A4 大小列印此文件，貼在開發區域

**維護者**: Claude | **最後更新**: 2025-10-24
