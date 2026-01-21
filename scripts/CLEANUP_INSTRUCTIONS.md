# 清理振禾有限公司測試資料 - 操作說明

## 📋 測試資料資訊

- **公司名稱**: 振禾有限公司
- **Company ID**: `9a987505-5044-493c-bb63-cba891bb79df`

## 🗑️ 清理步驟

### 方法 1: 使用 Supabase SQL Editor（推薦）

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 點擊左側 "SQL Editor"
4. 依序執行以下 SQL：

#### Step 1: 查看公司資訊
```sql
SELECT id, name, created_at
FROM companies
WHERE id = '9a987505-5044-493c-bb63-cba891bb79df';
```

#### Step 2: 刪除發票項目和發票
```sql
-- 刪除發票項目
DELETE FROM accounting_invoice_items
WHERE invoice_id IN (
    SELECT id FROM accounting_invoices
    WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df'
);

-- 刪除發票
DELETE FROM accounting_invoices
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
```

#### Step 3: 刪除傳票分錄和傳票
```sql
-- 刪除傳票分錄
DELETE FROM accounting_journal_entry_lines
WHERE entry_id IN (
    SELECT id FROM accounting_journal_entries
    WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df'
);

-- 刪除傳票
DELETE FROM accounting_journal_entries
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
```

#### Step 4: 刪除報價單項目和報價單
```sql
-- 刪除報價單項目
DELETE FROM quotation_items
WHERE quotation_id IN (
    SELECT id FROM quotations
    WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df'
);

-- 刪除報價單
DELETE FROM quotations
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
```

#### Step 5: 刪除其他相關資料
```sql
DELETE FROM payments WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
DELETE FROM customers WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
DELETE FROM products WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
DELETE FROM suppliers WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
DELETE FROM orders WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
DELETE FROM shipments WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
DELETE FROM contracts WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
DELETE FROM subscriptions WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
DELETE FROM company_settings WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';
```

#### Step 6: 最後刪除公司
```sql
DELETE FROM companies
WHERE id = '9a987505-5044-493c-bb63-cba891bb79df';
```

#### Step 7: 驗證刪除結果
```sql
SELECT COUNT(*) FROM companies WHERE id = '9a987505-5044-493c-bb63-cba891bb79df';
-- 應該返回 0
```

---

### 方法 2: 使用 psql 命令列（需安裝 PostgreSQL client）

```bash
# 設置環境變數
export PGHOST=db.oubsycwrxzkuviakzahi.supabase.co
export PGPORT=5432
export PGDATABASE=postgres
export PGUSER=postgres
export PGPASSWORD=eYkfcxvtFiWloXBS

# 執行清理腳本
psql -f scripts/cleanup_test_company.sql
```

---

### 方法 3: 使用 Supabase CLI

```bash
# 安裝 Supabase CLI (如尚未安裝)
npm install -g supabase

# 登入
supabase login

# 連線到專案
supabase link --project-ref oubsycwrxzkuviakzahi

# 執行清理
supabase db execute --file scripts/cleanup_test_company.sql
```

---

## ⚠️ 注意事項

1. **備份資料**: 刪除前建議先備份相關資料
2. **不可逆**: 刪除操作無法復原，請確認公司 ID 正確
3. **關聯資料**: 確保沒有其他重要的關聯資料會受影響

---

## ✅ 驗證完成

執行完後，應該看到：
- ✅ 公司記錄已刪除
- ✅ 所有關聯的發票、傳票、報價單等已清空
- ✅ 資料庫中不再有該公司的任何測試資料

如有任何錯誤，請檢查：
1. RLS Policy 是否阻擋刪除
2. Foreign Key constraint 是否阻止刪除
3. 公司 ID 是否正確
