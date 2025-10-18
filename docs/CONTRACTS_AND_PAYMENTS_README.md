# 合約管理和收款管理系統 - 實作說明

## 📋 實作內容總覽

本次實作完整建立了合約管理和收款管理功能，包含以下核心模組：

### ✅ 已完成的功能

#### 1. Service Layer 增強
- **合約管理服務** (`lib/services/contracts.ts`)
  - 報價單轉合約功能（含自動產生付款排程）
  - 下次應收資訊更新
  - 合約收款進度查詢
  - 逾期合約查詢

- **收款管理服務** (`lib/services/payments.ts`)
  - 記錄收款（自動觸發下次應收更新）
  - 已收款列表（使用資料庫視圖）
  - 未收款列表（>30天，使用資料庫視圖）
  - 下次收款提醒（使用資料庫視圖）
  - 批次標記逾期款項

#### 2. API 端點（11個）

**合約管理 API：**
- `POST /api/contracts/from-quotation` - 報價單轉合約
- `PUT /api/contracts/[id]/next-collection` - 更新下次應收
- `GET /api/contracts/[id]/payment-progress` - 查詢收款進度
- `GET /api/contracts/overdue` - 查詢逾期合約

**收款管理 API：**
- `POST /api/payments` - 記錄收款
- `GET /api/payments/collected` - 已收款列表
- `GET /api/payments/unpaid` - 未收款列表
- `GET /api/payments/reminders` - 收款提醒
- `POST /api/payments/[id]/mark-overdue` - 標記逾期

#### 3. 權限檢查中介層
- `lib/middleware/withPermission.ts`
  - 單一權限檢查：`withPermission(resource, action)`
  - 多重權限檢查：`withPermissions([...])`
  - 產品成本訪問權限：`canAccessProductCost()`
  - 認證檢查：`requireAuth()`

#### 4. 測試資料建立腳本
- `scripts/seed-test-data.ts`
  - 5個測試用戶（不同角色）
  - 5筆產品（含成本價）
  - 5筆客戶
  - 5筆報價單（含合約轉換）

---

## 📁 檔案結構

```
quotation-system/
├── lib/
│   ├── services/
│   │   ├── contracts.ts         ✅ 已更新（新增4個函式）
│   │   ├── payments.ts          ✅ 已更新（新增7個函式）
│   │   └── rbac.ts              ✅ 已檢查（權限功能完整）
│   └── middleware/
│       └── withPermission.ts    ✅ 新建立
│
├── app/api/
│   ├── contracts/
│   │   ├── from-quotation/
│   │   │   └── route.ts         ✅ 新建立
│   │   ├── [id]/
│   │   │   ├── next-collection/
│   │   │   │   └── route.ts     ✅ 新建立
│   │   │   └── payment-progress/
│   │   │       └── route.ts     ✅ 新建立
│   │   └── overdue/
│   │       └── route.ts         ✅ 新建立
│   │
│   └── payments/
│       ├── route.ts             ✅ 新建立（GET、POST）
│       ├── collected/
│       │   └── route.ts         ✅ 新建立
│       ├── unpaid/
│       │   └── route.ts         ✅ 新建立
│       ├── reminders/
│       │   └── route.ts         ✅ 新建立
│       └── [id]/
│           └── mark-overdue/
│               └── route.ts     ✅ 新建立
│
├── scripts/
│   └── seed-test-data.ts        ✅ 新建立
│
└── docs/
    ├── API_IMPLEMENTATION_GUIDE.md        ✅ 新建立（完整文檔）
    └── CONTRACTS_AND_PAYMENTS_README.md   ✅ 本檔案
```

---

## 🚀 快速開始

### 1. 執行資料庫 Migration

```bash
# Migration 004 已經包含所有必要的資料庫結構
# 確認 migrations/004_contracts_and_payments_enhancement.sql 已執行
```

### 2. 建立測試資料

```bash
npx ts-node scripts/seed-test-data.ts
```

### 3. 測試 API 端點

#### 報價單轉合約
```bash
curl -X POST http://localhost:3000/api/contracts/from-quotation \
  -H "Content-Type: application/json" \
  -d '{
    "quotation_id": "xxx",
    "signed_date": "2025-01-01",
    "expiry_date": "2026-01-01",
    "payment_frequency": "quarterly",
    "payment_day": 5
  }'
```

#### 記錄收款
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "xxx",
    "contract_id": "xxx",
    "payment_type": "recurring",
    "payment_date": "2025-02-05",
    "amount": 13125,
    "currency": "TWD",
    "payment_method": "bank_transfer"
  }'
```

#### 查詢收款提醒
```bash
curl http://localhost:3000/api/payments/reminders?days_ahead=30
```

---

## 💡 核心功能說明

### 自動化工作流程

#### 1. 報價單 → 合約轉換流程

```
報價單建立 → 客戶接受 → 調用 API 轉換為合約
                              ↓
                    自動執行以下操作：
                    1. 建立合約記錄
                    2. 更新報價單狀態 → accepted
                    3. 調用資料庫函式產生付款排程
                    4. 設定下次應收資訊
                    5. 更新客戶合約狀態
```

#### 2. 收款記錄 → 自動更新流程

```
記錄收款 → API 建立收款記錄
              ↓
    資料庫觸發器自動執行：
    1. 標記對應付款排程為已付款
    2. 計算下次應收日期（根據付款頻率）
    3. 更新合約的 next_collection_date
    4. 更新合約的 next_collection_amount
    5. 同步更新關聯報價單
    6. 更新客戶下次付款資訊
```

#### 3. 逾期檢測流程

```
每日定時任務 → 調用 batchMarkOverduePayments()
                  ↓
            資料庫函式執行：
            1. 找出所有 due_date < CURRENT_DATE 的 pending 排程
            2. 更新 status → overdue
            3. 計算 days_overdue
            4. 回傳更新數量和 ID 列表
```

---

## 🔐 權限設定

### 角色權限矩陣

| 功能 | super_admin | company_owner | sales_manager | sales | accountant |
|------|------------|---------------|---------------|-------|------------|
| 查看合約 | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ 自己的 | ✅ 全部 |
| 建立/編輯合約 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 報價單轉合約 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 查看收款記錄 | ✅ | ✅ | ✅ | ✅ 自己的 | ✅ |
| 記錄收款 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 查看產品成本 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 批次標記逾期 | ✅ | ✅ | ❌ | ❌ | ✅ |

### 使用權限中介層

```typescript
// 單一權限檢查
export const GET = withPermission('contracts', 'read')(
  async (req, context) => {
    // 只有有權限的用戶可以訪問
  }
);

// 多重權限檢查
export const POST = withPermissions([
  { resource: 'contracts', action: 'write' },
  { resource: 'payments', action: 'write' }
])(async (req, context) => {
  // 需要同時擁有兩個權限
});
```

---

## 📊 資料庫視圖

### 1. collected_payments_summary
**用途：** 已收款彙總，包含中文顯示和關聯資訊

**欄位：**
- `payment_type_display` - 頭款/期款/尾款/全額/定期收款
- `related_number` - 關聯的報價單或合約編號
- 客戶資訊、金額、收款方式等

### 2. unpaid_payments_30_days
**用途：** 未收款列表（超過30天未收）

**欄位：**
- `days_overdue` - 逾期天數
- `reminder_count` - 提醒次數
- `last_reminder_sent_at` - 最後提醒時間
- 客戶聯絡資訊、合約資訊等

### 3. next_collection_reminders
**用途：** 下次收款提醒

**欄位：**
- `next_collection_date` - 下次應收日期
- `next_collection_amount` - 下次應收金額
- `days_until_collection` - 距離收款日天數（負數表示已逾期）
- `collection_status` - overdue/due_today/due_soon/upcoming

---

## 🧪 測試建議

### 1. 完整流程測試

```bash
# 1. 建立測試資料
npx ts-node scripts/seed-test-data.ts

# 2. 取得報價單 ID（狀態為 sent）
GET /api/quotations?status=sent

# 3. 將報價單轉為合約
POST /api/contracts/from-quotation
{
  "quotation_id": "...",
  "signed_date": "2025-01-01",
  "expiry_date": "2026-01-01",
  "payment_frequency": "quarterly"
}

# 4. 查看合約收款進度
GET /api/contracts/{contract_id}/payment-progress

# 5. 記錄第一筆收款
POST /api/payments
{
  "contract_id": "...",
  "customer_id": "...",
  "payment_type": "recurring",
  "payment_date": "2025-02-05",
  "amount": 13125,
  "currency": "TWD"
}

# 6. 查看下次收款提醒
GET /api/payments/reminders

# 7. 查看已收款列表
GET /api/payments/collected

# 8. 查看未收款列表
GET /api/payments/unpaid
```

### 2. 權限測試

使用不同角色的用戶登入測試：
- ✅ 業務人員只能查看自己的資料
- ✅ 會計可以記錄收款
- ✅ 業務主管可以建立合約
- ✅ 一般業務不能查看產品成本

---

## 🛠️ 故障排除

### 問題 1: 下次應收日期沒有自動更新

**原因：** 資料庫觸發器未正確執行

**解決方案：**
```sql
-- 檢查觸發器是否存在
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_next_collection_date';

-- 重新執行 Migration 004
\i migrations/004_contracts_and_payments_enhancement.sql
```

### 問題 2: 權限檢查失敗

**原因：** 用戶角色未正確設定

**解決方案：**
```sql
-- 檢查用戶角色
SELECT * FROM user_permissions WHERE user_id = 'xxx';

-- 手動指派角色
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 'user-id', id, 'admin-id'
FROM roles WHERE name = 'accountant';
```

### 問題 3: 測試資料建立失敗

**原因：** 環境變數未設定

**解決方案：**
```bash
# 確認 .env.local 檔案存在
cat .env.local | grep ZEABUR_POSTGRES_URL

# 如果不存在，建立檔案
echo "ZEABUR_POSTGRES_URL=postgresql://user:pass@host:port/db" > .env.local
```

---

## 📈 效能考量

### 建議的索引（已在 Migration 004 中建立）

```sql
-- 合約收款查詢優化
CREATE INDEX idx_contracts_customer_active
  ON customer_contracts(customer_id, status)
  WHERE status = 'active';

-- 收款記錄查詢優化
CREATE INDEX idx_payments_customer_date
  ON payments(customer_id, payment_date DESC);

-- 付款排程查詢優化
CREATE INDEX idx_schedules_pending
  ON payment_schedules(due_date)
  WHERE status = 'pending';
```

### 查詢效能提示

1. **使用資料庫視圖** - 已收款、未收款、提醒列表都使用預先建立的視圖
2. **分頁查詢** - 對於大量資料，建議加入 `LIMIT` 和 `OFFSET`
3. **快取常用資料** - 考慮使用 Redis 快取收款統計數據

---

## 📝 下一步建議

### 功能增強
- [ ] 收款提醒郵件自動發送（整合 Email Service）
- [ ] 收款統計圖表（整合 Chart.js 或 Recharts）
- [ ] 匯出收款明細為 Excel
- [ ] 逾期款項自動催收通知
- [ ] 收款預測和趨勢分析

### 系統優化
- [ ] API 回應快取
- [ ] 批次操作 API（批次記錄收款）
- [ ] WebSocket 即時通知（新收款通知）
- [ ] 操作日誌記錄（Audit Log）

### 文檔完善
- [ ] API Swagger/OpenAPI 文檔
- [ ] 前端整合範例
- [ ] 錯誤碼對照表
- [ ] 效能測試報告

---

## 🤝 支援和協助

如有任何問題或需要協助，請參考：
- 📖 **完整 API 文檔**: `docs/API_IMPLEMENTATION_GUIDE.md`
- 🗂️ **Migration 檔案**: `migrations/004_contracts_and_payments_enhancement.sql`
- 🧪 **測試腳本**: `scripts/seed-test-data.ts`

---

**實作日期：** 2025-01-18
**版本：** 1.0.0
**狀態：** ✅ 完成並可投入使用
