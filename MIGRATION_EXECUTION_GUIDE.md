# Supabase Migration 執行指南

**生成時間**: 2025-10-21
**Migration 文件**: `supabase-migrations/004_zeabur_tables_migration.sql`

---

## 📋 執行前檢查清單

- [x] ✅ 已完成 Schema 差異分析
- [x] ✅ 已生成完整的 migration SQL (700+ 行)
- [x] ✅ Migration 包含所有表、索引、外鍵、觸發器、RLS policies
- [ ] ⏳ 待執行: 在 Supabase 建立 14 個新表

---

## 🎯 Migration 內容摘要

### 將建立的表 (14 個)

#### 1. RBAC 系統 (5 個表)
- `roles` - 角色定義 (含 5 個預設角色)
- `permissions` - 權限定義 (含 21 個權限)
- `role_permissions` - 角色權限對應
- `user_roles` - 使用者角色
- `user_profiles` - 使用者資料

#### 2. 多公司架構 (3 個表)
- `companies` - 公司資料
- `company_members` - 公司成員
- `company_settings` - 公司設定

#### 3. 合約與收款 (3 個表)
- `customer_contracts` - 客戶合約
- `payments` - 收款記錄
- `payment_schedules` - 付款排程

#### 4. 審計與擴充 (3 個表)
- `audit_logs` - 審計日誌
- `quotation_shares` - 報價單分享
- `quotation_versions` - 報價單版本控制

### 其他內容
- **91 個索引** (包含主鍵、外鍵索引、查詢優化索引)
- **21 個外鍵約束** (確保資料完整性)
- **14 個觸發器** (自動更新 updated_at)
- **完整的 RLS Policies** (所有表都有 auth.uid() 保護)

---

## 🚀 執行方法

### ⭐ 方法 1: Supabase Dashboard (推薦)

**最簡單、最安全的方式**

#### 步驟：

1. **打開 Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/editor
   ```

2. **建立新查詢**
   - 點擊左側的 "SQL Editor"
   - 點擊 "+ New query"

3. **複製 Migration SQL**
   - 打開文件: `supabase-migrations/004_zeabur_tables_migration.sql`
   - 全選並複製所有內容 (Cmd/Ctrl + A, Cmd/Ctrl + C)

4. **貼上並執行**
   - 貼到 SQL Editor (Cmd/Ctrl + V)
   - 點擊右下角 "Run" 按鈕 (或按 Cmd/Ctrl + Enter)

5. **等待執行完成**
   - 執行時間約 5-10 秒
   - 應該會看到 "Success" 訊息

6. **驗證結果**
   - 點擊左側 "Table Editor"
   - 應該會看到新增的 14 個表

---

### 方法 2: Supabase CLI

**適合熟悉命令列的開發者**

#### 步驟：

1. **安裝 Supabase CLI** (如果還沒安裝)
   ```bash
   npm install -g supabase
   ```

2. **登入 Supabase**
   ```bash
   supabase login
   ```

3. **連接到專案**
   ```bash
   supabase link --project-ref nxlqtnnssfzzpbyfjnby
   ```

4. **執行 Migration**
   ```bash
   supabase db push
   ```

   或手動執行特定文件：
   ```bash
   supabase db execute -f supabase-migrations/004_zeabur_tables_migration.sql
   ```

---

### 方法 3: PostgreSQL 直接連接

**需要資料庫連接字串**

#### 取得連接字串：

1. 訪問 Supabase Dashboard
2. Project Settings > Database
3. 找到 "Connection string" 區域
4. 選擇 "Transaction" 模式
5. 複製連接字串（記得替換 `[YOUR-PASSWORD]`）

#### 執行：

**選項 A: 使用 psql**
```bash
psql "postgresql://postgres.nxlqtnnssfzzpbyfjnby:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
  -f supabase-migrations/004_zeabur_tables_migration.sql
```

**選項 B: 使用我們的腳本**
```bash
# 在 .env.local 添加
SUPABASE_DB_URL=postgresql://postgres.nxlqtnnssfzzpbyfjnby:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# 執行腳本
npx tsx scripts/execute-migration-pg.ts
```

---

## ✅ 執行後驗證

### 1. 檢查表是否建立成功

在 SQL Editor 執行：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'roles', 'permissions', 'role_permissions', 'user_roles', 'user_profiles',
  'companies', 'company_members', 'company_settings',
  'customer_contracts', 'payments', 'payment_schedules',
  'audit_logs', 'quotation_shares', 'quotation_versions'
)
ORDER BY table_name;
```

**預期結果**: 應該返回 14 筆記錄

### 2. 檢查預設資料

```sql
-- 應該有 5 個角色
SELECT COUNT(*) as role_count FROM roles;

-- 應該有 21 個權限
SELECT COUNT(*) as permission_count FROM permissions;

-- 應該有 21 個角色權限對應
SELECT COUNT(*) as role_permission_count FROM role_permissions;
```

### 3. 檢查索引

```sql
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public';
```

**預期結果**: 應該顯著增加 (新增約 91 個)

### 4. 檢查外鍵

```sql
SELECT COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND constraint_type = 'FOREIGN KEY';
```

**預期結果**: 應該增加約 21 個

### 5. 檢查 RLS Policies

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**預期結果**: 每個表都應該有至少 4 個 policies (SELECT, INSERT, UPDATE, DELETE)

---

## ⚠️ 可能遇到的問題

### 問題 1: "relation already exists"

**原因**: 某些表已經存在

**解決方案**:
- Migration SQL 已經使用 `CREATE TABLE IF NOT EXISTS`
- 這是正常的，不會影響執行
- 已存在的表不會被覆蓋

### 問題 2: "permission denied"

**原因**: 權限不足

**解決方案**:
- 確認使用的是 service role key 或 postgres 用戶
- 在 Dashboard 執行通常不會有這個問題

### 問題 3: Foreign key 錯誤

**原因**: 被引用的表不存在

**解決方案**:
- 確認 `customers`, `products`, `quotations` 等核心表已存在
- 如果沒有，需要先執行之前的 migration

### 問題 4: 執行超時

**原因**: SQL 太大或網路問題

**解決方案**:
- 分段執行 (先執行表定義，再執行索引和 RLS)
- 使用本地 PostgreSQL 連接

---

## 📊 執行後的資料庫狀態

### 之前 (Supabase)
- 5 個核心業務表
- 基本的 RLS policies
- 簡單的索引結構

### 之後 (Supabase)
- **19 個表** (5 個現有 + 14 個新建)
- **完整的 RBAC 系統**
- **多公司架構支援**
- **合約與收款管理**
- **審計日誌**
- **報價單進階功能**
- **91+ 個索引** (優化查詢效能)
- **21 個外鍵** (確保資料完整性)
- **完整的 RLS policies** (保護所有資料)

---

## 🎯 下一步

Schema migration 完成後，接下來的步驟：

1. ✅ **驗證 Schema** - 確認所有表、索引、外鍵都正確建立
2. ⏳ **資料遷移** - 從 Zeabur 遷移實際資料到 Supabase
   - 核心表資料 (customers, products, quotations, etc.)
   - RBAC 資料 (如果有自訂角色和權限)
   - 進階功能資料 (companies, contracts, payments, etc.)
3. ⏳ **程式碼更新** - 更新所有使用 Zeabur 的程式碼
4. ⏳ **測試** - 完整功能測試
5. ⏳ **上線** - 部署到生產環境

---

## 📞 需要協助？

如果遇到問題：

1. 檢查 Supabase 的 Logs (Dashboard > Logs)
2. 查看錯誤訊息並參考上面的「可能遇到的問題」
3. 可以嘗試分段執行 SQL (先建表，再建索引，最後設 RLS)

---

**執行建議**: 使用方法 1 (Supabase Dashboard) 最為簡單可靠！

**預估執行時間**: 5-10 秒
**風險等級**: 低 (使用 `IF NOT EXISTS` 保護，不會覆蓋現有資料)
