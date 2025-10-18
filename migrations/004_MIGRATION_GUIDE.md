# Migration 004: 合約與收款管理增強

## 概述

此 migration 增強了合約管理和收款追蹤功能，包含：

1. 報價單轉合約時記錄關鍵資訊（簽約日期、到期日、付款頻率、下次應收）
2. 完整的收款追蹤系統（已收款、未收款、逾期偵測）
3. 自動計算下次應收日期和金額
4. 超過30天未收款項目自動標記
5. 產品成本管理權限控制

## 新增功能

### 1. 合約管理增強

#### Quotations 表新增欄位
- `contract_signed_date` - 合約簽訂日期
- `contract_expiry_date` - 合約到期日
- `payment_frequency` - 付款頻率（monthly/quarterly/semi_annual/annual）
- `next_collection_date` - 下次應收日期
- `next_collection_amount` - 下次應收金額

#### Customer Contracts 表新增欄位
- `next_collection_date` - 下次應收日期
- `next_collection_amount` - 下次應收金額
- `quotation_id` - 關聯的報價單

### 2. 收款管理

#### Payments 表新增欄位
- `payment_frequency` - 付款頻率（用於定期收款）
- `is_overdue` - 是否逾期
- `days_overdue` - 逾期天數

#### Payment Schedules 表新增欄位
- `days_overdue` - 逾期天數
- `last_reminder_sent_at` - 最後提醒時間
- `reminder_count` - 提醒次數

### 3. 自動化功能

#### 觸發器 (Triggers)
1. **update_next_collection_date()** - 收款後自動更新下次應收資訊
2. **check_payment_schedules_overdue()** - 自動偵測逾期付款排程

#### 函式 (Functions)
1. **generate_payment_schedules_for_contract()** - 自動產生合約付款排程
2. **mark_overdue_payments()** - 批次標記逾期付款（建議每日執行）

#### 視圖 (Views)
1. **unpaid_payments_30_days** - 超過30天未收款列表
2. **collected_payments_summary** - 已收款彙總
3. **next_collection_reminders** - 下次收款提醒

## 資料遷移策略

### 執行前準備

1. **備份資料庫**
```bash
pg_dump -h your-host -U your-user -d your-db > backup_before_004.sql
```

2. **檢查現有資料**
```sql
-- 檢查有無衝突的欄位名稱
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('quotations', 'customer_contracts', 'payments', 'payment_schedules')
ORDER BY table_name, ordinal_position;
```

### 執行 Migration

```bash
# 如果使用 Supabase
psql -h your-supabase-host -U postgres -d postgres -f migrations/004_contracts_and_payments_enhancement.sql

# 如果使用本地 PostgreSQL
psql -U your-user -d your-db -f migrations/004_contracts_and_payments_enhancement.sql
```

### 驗證遷移結果

```sql
-- 1. 檢查新欄位是否建立
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quotations'
  AND column_name IN ('contract_signed_date', 'contract_expiry_date', 'payment_frequency', 'next_collection_date');

-- 2. 檢查觸發器是否建立
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_update_next_collection_date',
  'trigger_check_payment_schedules_overdue'
);

-- 3. 檢查函式是否建立
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'generate_payment_schedules_for_contract',
  'mark_overdue_payments',
  'update_next_collection_date',
  'check_payment_schedules_overdue'
);

-- 4. 檢查視圖是否建立
SELECT table_name FROM information_schema.views
WHERE table_name IN (
  'unpaid_payments_30_days',
  'collected_payments_summary',
  'next_collection_reminders'
);
```

## 使用範例

### 1. 當報價單被接受時，記錄合約資訊

```typescript
// 更新報價單狀態為 accepted，並記錄合約資訊
const { data, error } = await supabase
  .from('quotations')
  .update({
    status: 'accepted',
    contract_signed_date: new Date().toISOString().split('T')[0],
    contract_expiry_date: '2026-12-31',
    payment_frequency: 'quarterly',
    next_collection_date: '2025-11-05', // 下個月5號
    next_collection_amount: 10000
  })
  .eq('id', quotationId);
```

### 2. 產生合約付款排程

```sql
-- 為合約產生付款排程（每季收款，每月5號扣款）
SELECT generate_payment_schedules_for_contract(
  'contract-uuid-here',
  '2025-10-18',  -- 起始日期（可選，預設為合約開始日期）
  5              -- 每月收款日（可選，預設為5號）
);
```

### 3. 記錄收款

```typescript
// 記錄一筆收款
const { data, error } = await supabase
  .from('payments')
  .insert({
    contract_id: 'contract-uuid',
    customer_id: 'customer-uuid',
    payment_type: 'installment',
    payment_frequency: 'quarterly',
    payment_date: '2025-10-18',
    amount: 10000,
    currency: 'TWD',
    payment_method: 'bank_transfer',
    reference_number: 'TXN123456',
    status: 'confirmed'
  });

// 觸發器會自動更新合約的 next_collection_date
```

### 4. 查詢未收款項目（>30天）

```typescript
// 查詢所有超過30天未收款的項目
const { data, error } = await supabase
  .from('unpaid_payments_30_days')
  .select('*')
  .order('days_overdue', { ascending: false });

// 結果包含：
// - 客戶資訊
// - 合約資訊
// - 逾期天數
// - 應收金額
// - 提醒次數
```

### 5. 查詢已收款記錄

```typescript
// 查詢特定客戶的已收款記錄
const { data, error } = await supabase
  .from('collected_payments_summary')
  .select('*')
  .eq('customer_id', 'customer-uuid')
  .order('payment_date', { ascending: false });

// 包含頭款、期款、尾款分類顯示
```

### 6. 批次標記逾期付款（建議每日執行）

```sql
-- 手動執行（或設定為 cron job）
SELECT * FROM mark_overdue_payments();

-- 回傳結果：
-- updated_count: 5
-- schedule_ids: [uuid1, uuid2, ...]
```

### 7. 查詢下次收款提醒

```typescript
// 查詢即將到期的收款（7天內）
const { data, error } = await supabase
  .from('next_collection_reminders')
  .select('*')
  .in('collection_status', ['overdue', 'due_today', 'due_soon'])
  .order('next_collection_date', { ascending: true });
```

## 權限管理

### 成本欄位權限控制

```typescript
// 只有 company_owner 和 accountant 可以查看成本
import { hasPermission } from '@/lib/rbac';

const canViewCost = await hasPermission(userId, 'products', 'read_cost');

if (canViewCost) {
  // 顯示成本和利潤
  const { data } = await supabase
    .from('products')
    .select('*, cost_price, cost_currency, profit_margin');
} else {
  // 隱藏成本資訊
  const { data } = await supabase
    .from('products')
    .select('id, name, base_price, currency, category');
}
```

## 效能優化

### 新增的索引

1. `idx_quotations_contract_expiry_date` - 查詢即將到期的合約
2. `idx_quotations_next_collection_date` - 查詢即將應收的款項
3. `idx_payments_overdue` - 查詢逾期付款
4. `idx_payment_schedules_overdue` - 查詢逾期排程
5. `idx_payments_customer_date` - 按客戶和日期查詢
6. `idx_schedules_customer_due` - 按客戶和到期日查詢

### 效能建議

1. **定期執行 VACUUM ANALYZE**
```sql
VACUUM ANALYZE quotations;
VACUUM ANALYZE payments;
VACUUM ANALYZE payment_schedules;
```

2. **監控慢查詢**
```sql
-- 啟用慢查詢日誌
ALTER DATABASE your_db SET log_min_duration_statement = 1000;
```

3. **使用 Connection Pooling**（Supabase 自動處理）

## 資料完整性

### CHECK 約束

1. `chk_quotations_payment_frequency` - 付款頻率必須是合法值
2. `chk_customer_contracts_payment_terms` - 付款條款必須是合法值
3. `chk_payments_payment_type` - 付款類型必須是合法值
4. `chk_payments_date_not_future` - 付款日期不能是未來
5. `chk_payments_amount_positive` - 付款金額必須大於0
6. `chk_schedules_amount_positive` - 排程金額必須大於0
7. `chk_contracts_next_collection_future` - 下次應收日期必須在合約期間內

## 回滾策略

如果需要回滾此 migration：

```sql
-- 1. 移除新增的欄位
ALTER TABLE quotations
  DROP COLUMN IF EXISTS contract_signed_date,
  DROP COLUMN IF EXISTS contract_expiry_date,
  DROP COLUMN IF EXISTS payment_frequency,
  DROP COLUMN IF EXISTS next_collection_date,
  DROP COLUMN IF EXISTS next_collection_amount;

ALTER TABLE customer_contracts
  DROP COLUMN IF EXISTS next_collection_date,
  DROP COLUMN IF EXISTS next_collection_amount,
  DROP COLUMN IF EXISTS quotation_id;

ALTER TABLE payments
  DROP COLUMN IF EXISTS payment_frequency,
  DROP COLUMN IF EXISTS is_overdue,
  DROP COLUMN IF EXISTS days_overdue;

ALTER TABLE payment_schedules
  DROP COLUMN IF EXISTS days_overdue,
  DROP COLUMN IF EXISTS last_reminder_sent_at,
  DROP COLUMN IF EXISTS reminder_count;

-- 2. 移除觸發器
DROP TRIGGER IF EXISTS trigger_update_next_collection_date ON payments;
DROP TRIGGER IF EXISTS trigger_check_payment_schedules_overdue ON payment_schedules;

-- 3. 移除函式
DROP FUNCTION IF EXISTS update_next_collection_date();
DROP FUNCTION IF EXISTS check_payment_schedules_overdue();
DROP FUNCTION IF EXISTS generate_payment_schedules_for_contract(UUID, DATE, INTEGER);
DROP FUNCTION IF EXISTS mark_overdue_payments();

-- 4. 移除視圖
DROP VIEW IF EXISTS unpaid_payments_30_days;
DROP VIEW IF EXISTS collected_payments_summary;
DROP VIEW IF EXISTS next_collection_reminders;

-- 5. 移除索引
DROP INDEX IF EXISTS idx_quotations_contract_expiry_date;
DROP INDEX IF EXISTS idx_quotations_next_collection_date;
DROP INDEX IF EXISTS idx_customer_contracts_quotation_id;
DROP INDEX IF EXISTS idx_customer_contracts_next_collection;
DROP INDEX IF EXISTS idx_payments_overdue;
DROP INDEX IF EXISTS idx_payment_schedules_overdue;
DROP INDEX IF EXISTS idx_payments_customer_date;
DROP INDEX IF EXISTS idx_schedules_customer_due;
DROP INDEX IF EXISTS idx_contracts_customer_active;
DROP INDEX IF EXISTS idx_quotations_contracted;
DROP INDEX IF EXISTS idx_schedules_pending;

-- 6. 移除約束
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS chk_quotations_payment_frequency;
ALTER TABLE customer_contracts DROP CONSTRAINT IF EXISTS chk_customer_contracts_payment_terms;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_payment_type;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_date_not_future;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_amount_positive;
ALTER TABLE payment_schedules DROP CONSTRAINT IF EXISTS chk_schedules_amount_positive;
ALTER TABLE customer_contracts DROP CONSTRAINT IF EXISTS chk_contracts_next_collection_future;
```

## 常見問題

### Q1: 如何設定每日自動執行逾期標記？

**A:** 在 Supabase 可以使用 pg_cron 擴充：

```sql
-- 啟用 pg_cron（需要超級使用者權限）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每天凌晨1點執行
SELECT cron.schedule(
  'mark-overdue-payments',
  '0 1 * * *',
  $$SELECT mark_overdue_payments()$$
);
```

### Q2: 收款日期可以修改嗎？

**A:** 可以。修改 `payment_schedules` 表的 `due_date` 欄位即可。觸發器會自動重新計算逾期狀態。

### Q3: 如何處理不規則收款？

**A:** 可以手動建立 `payment_schedules` 記錄，或使用 `generate_payment_schedules_for_contract` 函式後再手動調整個別排程。

### Q4: 付款頻率可以中途修改嗎？

**A:** 可以。更新合約的 `payment_terms` 欄位後，重新執行 `generate_payment_schedules_for_contract` 函式即可。

## 測試檢查清單

- [ ] 報價單轉合約時正確記錄所有欄位
- [ ] 收款後自動更新下次應收資訊
- [ ] 付款排程自動產生（月繳/季繳/半年繳/年繳）
- [ ] 逾期付款自動標記（>30天）
- [ ] 已收款區域正確顯示頭款、期款、尾款
- [ ] 未收款區域正確顯示逾期項目
- [ ] 下次收款提醒正確計算天數
- [ ] 成本欄位只有授權角色可見
- [ ] 所有索引正常運作
- [ ] 觸發器正確執行
- [ ] 視圖返回正確資料

## 相關檔案

- SQL Migration: `/migrations/004_contracts_and_payments_enhancement.sql`
- TypeScript Types: `/types/extended.types.ts`
- Database Types: `/types/database.types.ts`
- RBAC Types: `/types/rbac.types.ts`

## 後續開發建議

1. **前端頁面**
   - 合約管理頁面（列表、詳情、編輯）
   - 收款管理頁面（已收款、未收款分頁）
   - 收款提醒儀表板

2. **API 端點**
   - `POST /api/quotations/:id/accept` - 接受報價並建立合約
   - `POST /api/contracts/:id/payments` - 記錄收款
   - `GET /api/payments/overdue` - 查詢逾期款項
   - `POST /api/contracts/:id/schedules` - 產生付款排程

3. **通知系統**
   - Email 提醒逾期付款
   - Email 提醒即將到期收款
   - 系統內通知（bell icon）

4. **報表功能**
   - 收款統計報表（月報、年報）
   - 逾期分析報表
   - 客戶付款記錄報表

## 支援

如有問題請聯繫開發團隊或查看專案文件。
