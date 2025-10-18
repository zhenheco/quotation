# 合約管理和收款管理 API 實作指南

## 概覽

本文檔說明已實作的完整合約管理和收款管理功能，包括 Service Layer、API 端點、權限檢查中介層以及測試資料建立腳本。

## 目錄

- [1. Service Layer 增強](#1-service-layer-增強)
- [2. API 端點](#2-api-端點)
- [3. 權限檢查中介層](#3-權限檢查中介層)
- [4. 測試資料建立](#4-測試資料建立)
- [5. 使用範例](#5-使用範例)
- [6. 資料庫視圖說明](#6-資料庫視圖說明)

---

## 1. Service Layer 增強

### 1.1 合約管理服務 (`lib/services/contracts.ts`)

#### 新增函式

##### `convertQuotationToContract()`
將報價單轉換為合約，自動設定簽約日期、到期日、付款頻率和下次應收資訊。

```typescript
await convertQuotationToContract(userId, quotationId, {
  signed_date: '2025-01-01',
  expiry_date: '2026-01-01',
  payment_frequency: 'quarterly',
  payment_day: 5, // 每月5號收款
});
```

**功能：**
- ✅ 建立合約記錄並關聯報價單
- ✅ 更新報價單狀態為 `accepted`
- ✅ 自動產生付款排程（調用資料庫函式）
- ✅ 更新客戶合約狀態
- ✅ 使用資料庫事務確保資料一致性

##### `updateNextCollection()`
更新合約的下次應收資訊。

```typescript
await updateNextCollection(userId, contractId, {
  next_collection_date: '2025-05-05',
  next_collection_amount: 13125,
});
```

**功能：**
- ✅ 更新合約的下次應收日期和金額
- ✅ 同步更新關聯的報價單

##### `getContractPaymentProgress()`
取得合約的收款進度。

```typescript
const progress = await getContractPaymentProgress(userId, contractId);
// 回傳: { total_amount, total_paid, total_pending, total_overdue, payment_completion_rate }
```

##### `getContractsWithOverduePayments()`
取得有逾期款項的合約列表。

```typescript
const overdueContracts = await getContractsWithOverduePayments(userId);
// 回傳: 包含逾期天數、逾期金額等資訊的合約列表
```

---

### 1.2 收款管理服務 (`lib/services/payments.ts`)

#### 新增函式

##### `recordPayment()`
記錄收款並自動觸發下次應收日期更新（資料庫觸發器）。

```typescript
await recordPayment(userId, {
  customer_id: 'xxx',
  contract_id: 'xxx',
  payment_type: 'recurring',
  payment_date: '2025-02-05',
  amount: 13125,
  currency: 'TWD',
  payment_method: 'bank_transfer',
  reference_number: 'TXN-20250205-001',
  schedule_id: 'schedule-xxx', // 可選：關聯付款排程
});
```

**功能：**
- ✅ 建立收款記錄
- ✅ 自動標記關聯的付款排程為已付款
- ✅ 觸發資料庫自動更新下次應收日期（由 trigger 處理）
- ✅ 更新客戶下次付款資訊

##### `getCollectedPayments()`
取得已收款列表（使用資料庫視圖 `collected_payments_summary`）。

```typescript
const collected = await getCollectedPayments(userId, {
  customer_id: 'xxx',
  start_date: '2025-01-01',
  end_date: '2025-03-31',
  payment_type: 'recurring',
});
```

##### `getUnpaidPayments()`
取得未收款列表（超過30天，使用視圖 `unpaid_payments_30_days`）。

```typescript
const unpaid = await getUnpaidPayments(userId, {
  customer_id: 'xxx',
  min_days_overdue: 30,
});
```

##### `getNextCollectionReminders()`
取得下次收款提醒列表（使用視圖 `next_collection_reminders`）。

```typescript
const reminders = await getNextCollectionReminders(userId, {
  days_ahead: 30,
  status: 'due_soon', // overdue | due_today | due_soon | upcoming
});
```

##### `markPaymentAsOverdue()`
手動標記付款排程為逾期。

```typescript
await markPaymentAsOverdue(userId, scheduleId);
```

##### `batchMarkOverduePayments()`
批次標記所有逾期款項（調用資料庫函式）。

```typescript
const result = await batchMarkOverduePayments(userId);
// { updated_count: 5, schedule_ids: [...] }
```

##### `recordPaymentReminder()`
記錄已發送的收款提醒。

```typescript
await recordPaymentReminder(userId, scheduleId);
// 更新 last_reminder_sent_at 和 reminder_count
```

---

## 2. API 端點

### 2.1 合約管理 API

#### `POST /api/contracts/from-quotation`
從報價單建立合約

**Request Body:**
```json
{
  "quotation_id": "uuid",
  "signed_date": "2025-01-01",
  "expiry_date": "2026-01-01",
  "payment_frequency": "quarterly",
  "payment_day": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contract": { ... },
    "quotation": { ... }
  },
  "message": "報價單已成功轉換為合約"
}
```

---

#### `PUT /api/contracts/[id]/next-collection`
更新合約的下次應收資訊

**Request Body:**
```json
{
  "next_collection_date": "2025-05-05",
  "next_collection_amount": 13125
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "下次應收資訊已更新"
}
```

---

#### `GET /api/contracts/[id]/payment-progress`
查詢合約收款進度

**Response:**
```json
{
  "success": true,
  "data": {
    "contract_id": "uuid",
    "contract_number": "C2025-001",
    "total_amount": 52500,
    "total_paid": 26250,
    "total_pending": 13125,
    "total_overdue": 13125,
    "payment_completion_rate": 50.00
  }
}
```

---

#### `GET /api/contracts/overdue`
查詢有逾期款項的合約

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "contract_id": "uuid",
      "contract_number": "C2025-001",
      "customer_name_zh": "台北科技股份有限公司",
      "overdue_count": 2,
      "total_overdue_amount": 26250,
      "max_days_overdue": 45
    }
  ]
}
```

---

### 2.2 收款管理 API

#### `POST /api/payments`
記錄收款

**Request Body:**
```json
{
  "customer_id": "uuid",
  "contract_id": "uuid",
  "payment_type": "recurring",
  "payment_date": "2025-02-05",
  "amount": 13125,
  "currency": "TWD",
  "payment_method": "bank_transfer",
  "reference_number": "TXN-20250205-001",
  "schedule_id": "uuid",
  "notes": "第一季收款"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "收款記錄已建立，下次應收日期已自動更新"
}
```

---

#### `GET /api/payments/collected`
查詢已收款列表

**Query Parameters:**
- `customer_id` (optional)
- `start_date` (optional)
- `end_date` (optional)
- `payment_type` (optional)

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "count": 10,
  "summary": {
    "total_records": 10,
    "total_amount": 131250,
    "by_currency": {
      "TWD": 131250
    }
  }
}
```

---

#### `GET /api/payments/unpaid`
查詢未收款列表（超過30天）

**Query Parameters:**
- `customer_id` (optional)
- `min_days_overdue` (optional)

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "count": 5,
  "summary": {
    "total_records": 5,
    "total_amount": 65625,
    "max_days_overdue": 60,
    "by_currency": { "TWD": 65625 }
  }
}
```

---

#### `GET /api/payments/reminders`
查詢收款提醒列表

**Query Parameters:**
- `days_ahead` (default: 30)
- `status` (optional): overdue | due_today | due_soon | upcoming

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "count": 15,
  "summary": {
    "total_records": 15,
    "total_amount": 197500,
    "by_currency": { "TWD": 197500 },
    "by_status": {
      "overdue": 2,
      "due_today": 1,
      "due_soon": 5,
      "upcoming": 7
    }
  },
  "grouped": {
    "overdue": [ ... ],
    "due_today": [ ... ],
    "due_soon": [ ... ],
    "upcoming": [ ... ]
  }
}
```

---

#### `POST /api/payments/[id]/mark-overdue`
標記付款排程為逾期

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "付款排程已標記為逾期"
}
```

---

## 3. 權限檢查中介層

### 3.1 檔案位置
`lib/middleware/withPermission.ts`

### 3.2 使用方式

#### 單一權限檢查
```typescript
import { withPermission } from '@/lib/middleware/withPermission';

export const GET = withPermission('contracts', 'read')(
  async (req, context) => {
    // Your handler code
  }
);
```

#### 多重權限檢查
```typescript
import { withPermissions } from '@/lib/middleware/withPermission';

export const POST = withPermissions([
  { resource: 'contracts', action: 'write' },
  { resource: 'payments', action: 'write' }
])(async (req, context) => {
  // Your handler code
});
```

#### 檢查產品成本訪問權限
```typescript
import { canAccessProductCost } from '@/lib/middleware/withPermission';

export async function GET(req: NextRequest) {
  const canViewCost = await canAccessProductCost(req);

  if (!canViewCost) {
    // Hide cost_price field
  }
}
```

---

## 4. 測試資料建立

### 4.1 腳本位置
`scripts/seed-test-data.ts`

### 4.2 執行方式
```bash
npx ts-node scripts/seed-test-data.ts
```

### 4.3 建立的測試資料

#### 測試用戶
- `super_admin@test.com` - 總管理員
- `owner@test.com` - 公司負責人
- `manager@test.com` - 業務主管
- `sales@test.com` - 業務人員
- `accountant@test.com` - 會計

#### 測試產品（5筆，含成本價）
- Cloud Server 標準方案 (利潤率: 87.5%)
- Cloud Server 進階方案 (利潤率: 66.7%)
- SSL 憑證 (利潤率: 100%)
- 網站維護服務 (利潤率: 150%)
- 資料庫備份服務 (利潤率: 200%)

#### 測試客戶（5筆）
- 台北科技股份有限公司
- 新竹軟體開發公司
- 台中數位行銷有限公司
- 高雄雲端服務商
- 台南資訊科技公司

#### 測試報價單（5筆）
- 2筆草稿 (draft)
- 2筆已送出 (sent)
- 1筆已接受/已簽約 (accepted) → 自動轉換為合約並生成付款排程

---

## 5. 使用範例

### 5.1 完整的收款流程

#### Step 1: 將報價單轉為合約
```bash
POST /api/contracts/from-quotation
{
  "quotation_id": "xxx",
  "signed_date": "2025-01-01",
  "expiry_date": "2026-01-01",
  "payment_frequency": "quarterly",
  "payment_day": 5
}
```

**結果：**
- ✅ 建立合約記錄
- ✅ 報價單狀態更新為 `accepted`
- ✅ 自動產生4筆季繳付款排程（每季度5號）
- ✅ 設定下次應收日期和金額

---

#### Step 2: 查看合約收款進度
```bash
GET /api/contracts/{contract_id}/payment-progress
```

**回應：**
```json
{
  "total_amount": 52500,
  "total_paid": 0,
  "total_pending": 52500,
  "total_overdue": 0,
  "payment_completion_rate": 0
}
```

---

#### Step 3: 記錄第一筆收款（2025-02-05）
```bash
POST /api/payments
{
  "contract_id": "xxx",
  "customer_id": "xxx",
  "payment_type": "recurring",
  "payment_date": "2025-02-05",
  "amount": 13125,
  "currency": "TWD",
  "payment_method": "bank_transfer"
}
```

**資料庫自動執行：**
1. ✅ 建立收款記錄
2. ✅ 標記第一筆付款排程為 `paid`
3. ✅ **觸發器自動計算下次應收日期** → 2025-05-05
4. ✅ 更新合約的 `next_collection_date` 和 `next_collection_amount`
5. ✅ 更新關聯報價單的收款資訊
6. ✅ 更新客戶的下次付款資訊

---

#### Step 4: 查詢下次收款提醒
```bash
GET /api/payments/reminders?days_ahead=30
```

**回應：**
```json
{
  "data": [
    {
      "contract_number": "C2025-001",
      "customer_name_zh": "台北科技股份有限公司",
      "next_collection_date": "2025-05-05",
      "next_collection_amount": 13125,
      "collection_status": "upcoming"
    }
  ]
}
```

---

#### Step 5: 批次檢查逾期款項（定時任務）
```typescript
// 可在 cron job 中執行
const result = await batchMarkOverduePayments(userId);
console.log(`已標記 ${result.updated_count} 筆逾期款項`);
```

---

#### Step 6: 查詢逾期合約
```bash
GET /api/contracts/overdue
```

---

### 5.2 查詢收款統計

#### 已收款彙總
```bash
GET /api/payments/collected?start_date=2025-01-01&end_date=2025-03-31
```

#### 未收款列表（>30天）
```bash
GET /api/payments/unpaid?min_days_overdue=30
```

---

## 6. 資料庫視圖說明

### 6.1 `collected_payments_summary`
已收款彙總視圖，包含：
- 頭款、期款、尾款等中文顯示
- 關聯的報價單或合約編號
- 收款方式、參考號碼
- 收據連結

### 6.2 `unpaid_payments_30_days`
未收款視圖（超過30天），包含：
- 逾期天數
- 客戶聯絡資訊
- 合約資訊
- 提醒次數和最後提醒時間

### 6.3 `next_collection_reminders`
下次收款提醒視圖，包含：
- 下次應收日期和金額
- 距離收款日的天數
- 收款狀態分類（overdue/due_today/due_soon/upcoming）

---

## 7. 權限設定

### 7.1 角色權限對照

| 角色 | 查看合約 | 編輯合約 | 查看收款 | 記錄收款 | 查看成本 |
|------|---------|---------|---------|---------|---------|
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| company_owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| sales_manager | ✅ | ✅ | ✅ | ❌ | ❌ |
| sales | ✅ (自己) | ❌ | ✅ (自己) | ❌ | ❌ |
| accountant | ✅ | ❌ | ✅ | ✅ | ✅ |

---

## 8. 注意事項

### 8.1 自動化功能
- ✅ 收款後自動更新下次應收日期（資料庫觸發器）
- ✅ 付款排程逾期自動檢測（資料庫觸發器）
- ✅ 合約轉換時自動產生付款排程（資料庫函式）

### 8.2 資料驗證
- ✅ 到期日必須晚於簽約日
- ✅ 付款金額必須為正數
- ✅ 付款日期不可為未來日期
- ✅ 付款頻率必須為有效值

### 8.3 交易安全
- ✅ 使用資料庫事務確保資料一致性
- ✅ 發生錯誤時自動回滾
- ✅ 權限檢查在所有操作前執行

---

## 9. 後續建議

### 9.1 功能擴充
- [ ] 收款提醒郵件自動發送
- [ ] 逾期款項自動催收通知
- [ ] 收款統計圖表和報表
- [ ] 匯出收款明細為 Excel

### 9.2 效能優化
- [ ] 為常用查詢建立索引
- [ ] 使用 Redis 快取收款統計
- [ ] 大量資料分頁查詢

### 9.3 監控和日誌
- [ ] API 調用監控
- [ ] 收款異常告警
- [ ] 操作日誌記錄（audit log）

---

## 實作完成清單

- ✅ Service Layer 增強
  - ✅ `convertQuotationToContract()` - 報價單轉合約
  - ✅ `updateNextCollection()` - 更新下次應收
  - ✅ `getContractPaymentProgress()` - 合約收款進度
  - ✅ `getContractsWithOverduePayments()` - 逾期合約查詢
  - ✅ `recordPayment()` - 記錄收款
  - ✅ `getCollectedPayments()` - 已收款列表
  - ✅ `getUnpaidPayments()` - 未收款列表
  - ✅ `getNextCollectionReminders()` - 收款提醒
  - ✅ `markPaymentAsOverdue()` - 標記逾期
  - ✅ `batchMarkOverduePayments()` - 批次標記逾期
  - ✅ `recordPaymentReminder()` - 記錄提醒

- ✅ API 端點
  - ✅ `POST /api/contracts/from-quotation`
  - ✅ `PUT /api/contracts/[id]/next-collection`
  - ✅ `GET /api/contracts/[id]/payment-progress`
  - ✅ `GET /api/contracts/overdue`
  - ✅ `POST /api/payments`
  - ✅ `GET /api/payments/collected`
  - ✅ `GET /api/payments/unpaid`
  - ✅ `GET /api/payments/reminders`
  - ✅ `POST /api/payments/[id]/mark-overdue`

- ✅ 權限檢查中介層
  - ✅ `withPermission()` - 單一權限檢查
  - ✅ `withPermissions()` - 多重權限檢查
  - ✅ `canAccessProductCost()` - 產品成本訪問權限
  - ✅ `requireAuth()` - 需要認證

- ✅ 測試資料建立
  - ✅ 5個測試用戶（含不同角色）
  - ✅ 5筆產品（含成本價和利潤率）
  - ✅ 5筆客戶
  - ✅ 5筆報價單（含不同狀態）
  - ✅ 自動建立合約和付款排程

---

**最後更新：2025-01-18**
