# Supabase Migration 執行指南

## 🎯 目標

修復以下問題：
- ❌ `ERROR: 42703: column "sku" does not exist`
- ❌ `ERROR: 42501: permission denied for table customers/products/quotations`

## 📋 執行步驟（推薦方式）

### 方式一：Supabase Dashboard（最簡單）✅

這是**最安全、最推薦**的方式，因為：
- 可視化界面，可以看到執行結果
- 自動處理權限問題
- 可以逐步執行，方便 debug
- 有錯誤提示和歷史記錄

**步驟：**

1. **打開 Supabase Dashboard SQL Editor**
   ```
   https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/sql/new
   ```

2. **複製 SQL 內容**

   在本地執行：
   ```bash
   cat supabase-migrations/000_drop_and_recreate.sql
   ```

   或直接在編輯器中打開：
   ```bash
   open supabase-migrations/000_drop_and_recreate.sql
   ```

3. **貼上 SQL 到 Dashboard**

   - 全選複製 SQL 內容（273 行）
   - 貼到 Supabase SQL Editor 中
   - 確認內容完整

4. **執行 SQL**

   - 點擊右下角綠色 **"Run"** 按鈕
   - 等待執行完成（約 5-10 秒）
   - 應該會看到成功訊息

5. **驗證結果**

   執行成功後，你應該看到：
   ```
   status
   --------
   Schema recreated successfully! All tables, indexes, triggers, and RLS policies are in place.
   ```

   可以在 Table Editor 中確認表已創建：
   - `customers` ✅
   - `products` ✅（包含 `sku` 欄位）
   - `quotations` ✅
   - `quotation_items` ✅
   - `exchange_rates` ✅

---

### 方式二：使用 psql 命令（進階）

**前置條件：**
- 已安裝 PostgreSQL 客戶端（psql）
- 需要從 Supabase Dashboard 取得 Database Password

**步驟：**

1. **取得資料庫密碼**
   ```
   Supabase Dashboard → Settings → Database → Database Password
   ```

   點擊 "Reset database password" 如果忘記密碼

2. **取得連接字串**

   在 Settings → Database → Connection string → URI 中找到：
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

   以本項目為例：
   ```
   postgresql://postgres.nxlqtnnssfzzpbyfjnby:[YOUR-PASSWORD]@db.nxlqtnnssfzzpbyfjnby.supabase.co:5432/postgres
   ```

3. **執行 migration**
   ```bash
   psql "postgresql://postgres.nxlqtnnssfzzpbyfjnby:[YOUR-PASSWORD]@db.nxlqtnnssfzzpbyfjnby.supabase.co:5432/postgres" \
     -f supabase-migrations/000_drop_and_recreate.sql
   ```

4. **驗證結果**
   ```bash
   psql "postgresql://..." -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"
   ```

---

### 方式三：使用輔助腳本

我們提供了一個輔助腳本來顯示所有執行選項：

```bash
./scripts/migrate-supabase.sh
```

這個腳本會：
- 顯示所有可用的執行方式
- 提供 SQL 內容摘要
- 給出具體的命令範例

---

## ✅ 驗證 Migration 是否成功

### 1. 在 Supabase Dashboard 檢查

**Table Editor:**
- 進入 Table Editor
- 確認 5 個表都存在
- 點擊 `products` 表，確認有 `sku` 欄位
- 點擊 `quotations` 表，確認有 `total_amount` 欄位（不是 `total`）

**SQL Editor:**
```sql
-- 檢查表是否存在
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 檢查 products 表結構
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### 2. 在本地應用中檢查

執行診斷腳本：
```bash
npx tsx scripts/diagnose-supabase.ts
```

應該看到：
```
✅ customers - 表存在
✅ products - 表存在
✅ quotations - 表存在
✅ quotation_items - 表存在
✅ exchange_rates - 表存在
```

### 3. 重啟開發伺服器

```bash
# 清除快取
rm -rf .next

# 重新啟動
npm run dev
```

打開瀏覽器訪問：
- http://localhost:3000/zh/customers
- http://localhost:3000/zh/products
- http://localhost:3000/zh/quotations

**應該不再看到** permission denied 錯誤！

---

## 🔍 常見問題

### Q: 執行後看到 "relation already exists" 錯誤

**A:** SQL 文件開頭已包含 `DROP TABLE IF EXISTS`，這個錯誤通常不影響。重新執行一次即可。

### Q: 看到 "permission denied for schema public"

**A:** 使用 Dashboard 執行，它會自動使用正確的權限。如果使用 psql，確保使用的是 service role 或有足夠權限的用戶。

### Q: 我的測試數據會被刪除嗎？

**A:** **是的！** 這個 migration 會 DROP 所有表，所有數據都會被清除。如果有重要數據，請先備份：

```bash
# 使用 Supabase Dashboard 的 Backup 功能
# 或使用 pg_dump
pg_dump "postgresql://..." > backup_$(date +%Y%m%d).sql
```

### Q: RLS 策略會自動應用嗎？

**A:** 是的，SQL 文件包含完整的 RLS 策略創建語句。執行後所有策略都會自動配置。

---

## 📊 Migration 內容說明

這個 migration 會：

### 刪除（DROP）
- ✅ 所有業務表及其依賴
- ✅ 舊的觸發器函數
- ✅ 舊的索引和約束

### 創建（CREATE）
- ✅ 5 個業務表（正確的 schema）
- ✅ 所有必要的索引
- ✅ `update_updated_at_column()` 觸發器函數
- ✅ 每個表的 updated_at 自動更新觸發器

### 配置（CONFIGURE）
- ✅ 啟用所有表的 RLS
- ✅ 創建基於 `auth.uid()` 的用戶隔離策略
- ✅ 配置 quotation_items 的關聯查詢策略
- ✅ 配置 exchange_rates 的認證用戶訪問策略

### 修復的問題
1. ✅ `products` 表新增 `sku` 欄位
2. ✅ `products.base_price` 重命名為 `unit_price`
3. ✅ `quotations.total` 重命名為 `total_amount`
4. ✅ `customers` 新增 `tax_id` 和 `contact_person`
5. ✅ 修復所有 RLS 策略配置

---

## 🎯 執行後的下一步

1. **重啟開發伺服器** 並測試所有頁面
2. **運行測試套件** 確保沒有新的錯誤
3. **導入測試數據**（如需要）：
   ```bash
   npx tsx scripts/create-test-data.ts
   ```
4. **標記 P0 問題為已解決**
5. **繼續 Phase 3：解決 P1 Critical 問題**

---

## 💡 需要幫助？

如果遇到問題：
1. 檢查 Supabase Dashboard 的 Logs 頁面
2. 運行診斷腳本：`npx tsx scripts/diagnose-supabase.ts`
3. 查看開發伺服器的 console 輸出
4. 檢查瀏覽器 Network tab 中的 API 請求

---

**最後更新**: 2025-10-17
**相關文件**:
- `supabase-migrations/000_drop_and_recreate.sql`
- `scripts/migrate-supabase.sh`
- `QUICK_FIX.md`
