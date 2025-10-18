# 快速參考卡 - 合約管理和收款管理 API

## 🚀 快速開始（3 分鐘）

### 1. 建立測試資料
```bash
npm run seed
```

### 2. 啟動開發伺服器
```bash
npm run dev
```

### 3. 測試第一個 API
```bash
curl http://localhost:3000/api/payments/reminders
```

---

## 📚 API 端點速查表

### 合約管理 API

| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/contracts/from-quotation` | POST | 報價單轉合約 |
| `/api/contracts/[id]/next-collection` | PUT | 更新下次應收 |
| `/api/contracts/[id]/payment-progress` | GET | 查詢收款進度 |
| `/api/contracts/overdue` | GET | 查詢逾期合約 |

### 收款管理 API

| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/payments` | POST | 記錄收款 |
| `/api/payments` | GET | 查詢收款列表 |
| `/api/payments/collected` | GET | 已收款列表 |
| `/api/payments/unpaid` | GET | 未收款列表 |
| `/api/payments/reminders` | GET | 收款提醒 |
| `/api/payments/[id]/mark-overdue` | POST | 標記逾期 |

---

## 💡 常用 curl 命令

### 報價單轉合約
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

### 記錄收款
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

### 查詢收款提醒
```bash
curl http://localhost:3000/api/payments/reminders?days_ahead=30
```

### 查詢已收款列表
```bash
curl http://localhost:3000/api/payments/collected?start_date=2025-01-01
```

### 查詢未收款列表
```bash
curl http://localhost:3000/api/payments/unpaid?min_days_overdue=30
```

### 查詢逾期合約
```bash
curl http://localhost:3000/api/contracts/overdue
```

---

## 🔐 權限速查表

| 角色 | 查看合約 | 編輯合約 | 記錄收款 | 查看成本 |
|------|---------|---------|---------|---------|
| super_admin | ✅ 全部 | ✅ | ✅ | ✅ |
| company_owner | ✅ 全部 | ✅ | ✅ | ✅ |
| sales_manager | ✅ 全部 | ✅ | ❌ | ❌ |
| sales | ✅ 自己的 | ❌ | ❌ | ❌ |
| accountant | ✅ 全部 | ❌ | ✅ | ✅ |

---

## 📋 Service 函式速查表

### 合約管理 (`lib/services/contracts.ts`)

```typescript
// 報價單轉合約
await convertQuotationToContract(userId, quotationId, {
  signed_date: '2025-01-01',
  expiry_date: '2026-01-01',
  payment_frequency: 'quarterly',
});

// 更新下次應收
await updateNextCollection(userId, contractId, {
  next_collection_date: '2025-05-05',
  next_collection_amount: 13125,
});

// 查詢收款進度
await getContractPaymentProgress(userId, contractId);

// 查詢逾期合約
await getContractsWithOverduePayments(userId);
```

### 收款管理 (`lib/services/payments.ts`)

```typescript
// 記錄收款
await recordPayment(userId, {
  customer_id: 'xxx',
  contract_id: 'xxx',
  payment_type: 'recurring',
  payment_date: '2025-02-05',
  amount: 13125,
  currency: 'TWD',
});

// 查詢已收款
await getCollectedPayments(userId, {
  start_date: '2025-01-01',
  end_date: '2025-03-31',
});

// 查詢未收款
await getUnpaidPayments(userId, {
  min_days_overdue: 30,
});

// 查詢收款提醒
await getNextCollectionReminders(userId, {
  days_ahead: 30,
  status: 'due_soon',
});

// 標記逾期
await markPaymentAsOverdue(userId, scheduleId);

// 批次標記逾期
await batchMarkOverduePayments(userId);
```

---

## 🎯 常見使用場景

### 場景 1: 簽約後建立合約
```typescript
// 1. 客戶接受報價單
// 2. 調用 API 轉換為合約
const result = await fetch('/api/contracts/from-quotation', {
  method: 'POST',
  body: JSON.stringify({
    quotation_id: quotationId,
    signed_date: '2025-01-01',
    expiry_date: '2026-01-01',
    payment_frequency: 'quarterly',
  }),
});

// 3. 系統自動產生付款排程
// 4. 設定下次應收日期
```

### 場景 2: 收款並更新下次應收
```typescript
// 1. 記錄收款
await fetch('/api/payments', {
  method: 'POST',
  body: JSON.stringify({
    contract_id: contractId,
    customer_id: customerId,
    payment_date: '2025-02-05',
    amount: 13125,
    currency: 'TWD',
  }),
});

// 2. 資料庫觸發器自動：
//    - 標記付款排程為已付款
//    - 計算下次應收日期
//    - 更新合約下次應收資訊
```

### 場景 3: 查看收款狀況
```typescript
// 1. 查詢已收款
const collected = await fetch('/api/payments/collected');

// 2. 查詢未收款
const unpaid = await fetch('/api/payments/unpaid');

// 3. 查詢收款提醒
const reminders = await fetch('/api/payments/reminders');
```

### 場景 4: 逾期管理
```typescript
// 1. 批次標記逾期（定時任務）
// 每日執行
await batchMarkOverduePayments(userId);

// 2. 查詢逾期合約
const overdueContracts = await fetch('/api/contracts/overdue');

// 3. 發送提醒（可選）
for (const contract of overdueContracts) {
  await sendPaymentReminder(contract);
}
```

---

## 🗂️ 資料庫視圖速查表

### `collected_payments_summary`
已收款彙總
```sql
SELECT * FROM collected_payments_summary
WHERE customer_id = 'xxx'
ORDER BY payment_date DESC;
```

### `unpaid_payments_30_days`
未收款列表（>30天）
```sql
SELECT * FROM unpaid_payments_30_days
WHERE days_overdue >= 30
ORDER BY days_overdue DESC;
```

### `next_collection_reminders`
收款提醒
```sql
SELECT * FROM next_collection_reminders
WHERE collection_status = 'due_soon'
ORDER BY next_collection_date ASC;
```

---

## 🛠️ 常用腳本命令

```bash
# 建立測試資料
npm run seed

# 執行 Migration
npm run migrate

# 測試 API
./scripts/test-api-endpoints.sh

# 啟動開發伺服器
npm run dev

# 執行測試
npm run test
```

---

## 🔍 故障排除速查表

### 問題: 下次應收日期沒有自動更新

**檢查觸發器:**
```sql
SELECT * FROM pg_trigger
WHERE tgname = 'trigger_update_next_collection_date';
```

**重新執行 Migration:**
```bash
psql $DATABASE_URL -f migrations/004_contracts_and_payments_enhancement.sql
```

### 問題: 權限檢查失敗

**檢查用戶權限:**
```sql
SELECT * FROM user_permissions WHERE user_id = 'xxx';
```

**手動指派角色:**
```sql
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 'user-id', id, 'admin-id'
FROM roles WHERE name = 'accountant';
```

### 問題: API 回傳 401 Unauthorized

**檢查 Session:**
- 確認用戶已登入
- 檢查 NextAuth 配置
- 查看瀏覽器 Cookie

### 問題: API 回傳 403 Forbidden

**檢查權限:**
- 確認用戶角色正確
- 檢查 role_permissions 表
- 查看 RBAC 配置

---

## 📊 付款頻率對照表

| 值 | 中文 | 間隔月數 | 每年次數 |
|----|------|---------|---------|
| `monthly` | 月繳 | 1 | 12 |
| `quarterly` | 季繳 | 3 | 4 |
| `semi_annual` | 半年繳 | 6 | 2 |
| `annual` | 年繳 | 12 | 1 |

---

## 💰 收款類型對照表

| 值 | 中文 | 說明 |
|----|------|------|
| `deposit` | 頭款 | 合約簽訂時收取 |
| `installment` | 期款 | 分期付款 |
| `final` | 尾款 | 最後一筆款項 |
| `full` | 全額 | 一次付清 |
| `recurring` | 定期收款 | 定期合約收款 |

---

## 🔔 收款狀態對照表

| 狀態 | 中文 | 說明 |
|------|------|------|
| `overdue` | 已逾期 | 超過應收日且未收款 |
| `due_today` | 今日到期 | 今天是應收日 |
| `due_soon` | 即將到期 | 7天內到期 |
| `upcoming` | 未來到期 | 7天後到期 |

---

## 📱 前端整合範例

### React Hook
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// 查詢收款提醒
const { data: reminders } = useQuery({
  queryKey: ['payment-reminders'],
  queryFn: () => fetch('/api/payments/reminders').then(r => r.json()),
});

// 記錄收款
const { mutate: recordPayment } = useMutation({
  mutationFn: (data) => fetch('/api/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  onSuccess: () => {
    // 重新載入資料
    queryClient.invalidateQueries(['payments']);
  },
});
```

### Next.js Server Component
```typescript
// app/payments/page.tsx
export default async function PaymentsPage() {
  const response = await fetch('http://localhost:3000/api/payments/collected', {
    cache: 'no-store',
  });
  const { data } = await response.json();

  return (
    <div>
      {data.map(payment => (
        <PaymentCard key={payment.id} payment={payment} />
      ))}
    </div>
  );
}
```

---

## 📖 延伸閱讀

- 📘 **完整文檔**: `docs/API_IMPLEMENTATION_GUIDE.md`
- 📗 **使用指南**: `docs/CONTRACTS_AND_PAYMENTS_README.md`
- 📙 **實作總結**: `IMPLEMENTATION_SUMMARY.md`
- 💻 **程式範例**: `examples/api-usage-examples.ts`

---

**版本**: 1.0.0 | **更新日期**: 2025-01-18
