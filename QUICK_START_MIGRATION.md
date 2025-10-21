# 🚀 快速遷移指南

**當前狀態**: ✅ Schema Migration SQL 已準備好並在剪貼簿中

---

## 步驟 1: 執行 Schema Migration (5 分鐘) ⏰

### 選項 A: Supabase Dashboard（推薦）✨

1. **打開已自動開啟的瀏覽器** 或訪問：
   ```
   https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/editor
   ```

2. **登入** Supabase 帳號

3. **執行 SQL**:
   - 點擊 "+ New query"
   - 按 `Cmd+V` 貼上 SQL（已在剪貼簿）
   - 點擊 "Run" 或按 `Cmd+Enter`
   - 等待 5-10 秒

4. **驗證**:
   執行此查詢確認建立了 14 個表：
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'roles', 'permissions', 'role_permissions', 'user_roles', 'user_profiles',
     'companies', 'company_members', 'company_settings',
     'customer_contracts', 'payments', 'payment_schedules',
     'audit_logs', 'quotation_shares', 'quotation_versions'
   ) ORDER BY table_name;
   ```
   ✅ 應該返回 14 筆

### 選項 B: 手動複製（如果剪貼簿已清空）

```bash
# 重新複製 SQL 到剪貼簿
pbcopy < supabase-migrations/004_zeabur_tables_migration.sql

# 打開 Dashboard
open "https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/editor"
```

---

## 步驟 2: 執行資料遷移 (10-30 分鐘，視資料量而定) ⏰

### 確認 Schema Migration 完成後執行：

```bash
# 執行資料遷移腳本
npx tsx scripts/migrate-data-to-supabase.ts
```

### 腳本會自動：

1. ✅ 連接 Zeabur 和 Supabase
2. ✅ 檢查兩邊的資料數量
3. ✅ 按順序遷移所有表：
   - Phase 2.1: 核心業務 (customers, products, quotations, etc.)
   - Phase 2.2: 公司設定
   - Phase 2.3: 使用者資料
   - Phase 2.4: 合約付款
   - Phase 2.5: 審計與進階功能
4. ✅ 顯示詳細統計報告

### 預期輸出：

```
🚀 資料遷移：Zeabur → Supabase
======================================================================

🔌 連接 Zeabur PostgreSQL...
✅ Zeabur 連接成功

🔌 連接 Supabase...
✅ Supabase 連接成功

📊 Phase 2.1: 核心業務資料
──────────────────────────────────────────────────────────
📦 遷移 customers...
   Zeabur: 50 筆資料
   Supabase (遷移前): 0 筆
   ⬆️  開始插入...
   ✅ 成功遷移 50 筆資料

📦 遷移 products...
   ...

📊 遷移統計報告
======================================================================
表名                  Zeabur  →  Supabase  遷移  跳過  失敗  耗時
──────────────────────────────────────────────────────────
✅ customers              50 →        0    50     0     0  1234ms
✅ products              100 →        0   100     0     0  2345ms
...

總計:  遷移 500 筆, 跳過 0 筆, 失敗 0 筆

✅ 所有資料遷移成功！
```

---

## 步驟 3: 驗證遷移結果 (5 分鐘) ⏰

### 在 Supabase Dashboard 執行驗證查詢：

```sql
-- 1. 檢查所有表的資料量
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_tup_ins AS inserts,
  n_tup_upd AS updates,
  n_tup_del AS deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 檢查核心業務表
SELECT 'customers' as table_name, COUNT(*) as count FROM customers
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'quotations', COUNT(*) FROM quotations
UNION ALL SELECT 'quotation_items', COUNT(*) FROM quotation_items;

-- 3. 檢查 RBAC 設定
SELECT COUNT(*) as role_count FROM roles;  -- 應該是 5
SELECT COUNT(*) as permission_count FROM permissions;  -- 應該是 21
SELECT COUNT(*) as mapping_count FROM role_permissions;  -- 應該是 21+
```

---

## 步驟 4: 程式碼更新 (15 分鐘) ⏰

遷移完成後，需要更新程式碼：

### 4.1 移除 Zeabur 依賴

```typescript
// 需要更新的文件：
// - lib/services/database.ts
// - lib/db/zeabur.ts (可能可以刪除)
// - 所有使用 Zeabur 連接的 API routes
```

### 4.2 更新環境變數

```bash
# .env.local - 移除 Zeabur
# ZEABUR_POSTGRES_URL=...  # 可以註解或刪除
```

---

## 步驟 5: 測試系統 (30 分鐘) ⏰

```bash
# 啟動開發伺服器
npm run dev

# 測試功能：
# ✅ 登入/註冊
# ✅ 查看客戶列表
# ✅ 查看產品列表
# ✅ 建立報價單
# ✅ 查看報價單列表
# ✅ 編輯報價單
# ✅ 刪除測試資料
# ✅ 權限控制
```

---

## 常見問題 ❓

### Q1: Schema Migration 執行失敗怎麼辦？

A: 檢查錯誤訊息：
- 如果是 "already exists"：正常，表示表已存在
- 如果是 "permission denied"：確認使用正確的帳號登入
- 其他錯誤：複製錯誤訊息並查看 MIGRATION_EXECUTION_GUIDE.md

### Q2: 資料遷移中斷怎麼辦？

A: 重新執行腳本，腳本會：
- 自動跳過已遷移的表
- 只遷移缺少的資料
- 不會覆蓋現有資料

### Q3: 可以分階段遷移嗎？

A: 可以！編輯 `migrate-data-to-supabase.ts`：
- 註解掉不需要立即遷移的 phase
- 先遷移核心表，測試通過後再遷移其他表

### Q4: 如何回滾？

A: Zeabur 資料不會被刪除：
1. 在 Supabase Dashboard 刪除遷移的表
2. 重新執行之前的 schema
3. 程式碼改回使用 Zeabur 連接

---

## 遷移檢查清單 ✅

### Schema Migration
- [ ] SQL 已複製到剪貼簿
- [ ] Supabase Dashboard 已開啟
- [ ] 已登入 Supabase
- [ ] 執行 SQL (Run 按鈕)
- [ ] 驗證 14 個表已建立

### 資料 Migration
- [ ] Schema migration 已完成
- [ ] 執行資料遷移腳本
- [ ] 檢查統計報告無錯誤
- [ ] 在 Supabase 驗證資料

### 系統更新
- [ ] 程式碼移除 Zeabur 依賴
- [ ] 環境變數更新
- [ ] 執行完整功能測試
- [ ] 所有功能正常運作

### 文檔更新
- [ ] 更新 CHANGELOG.md
- [ ] 更新 README.md（如需要）
- [ ] 記錄遷移日期和結果

---

## 需要協助？

- 📖 詳細執行指南：`MIGRATION_EXECUTION_GUIDE.md`
- 📋 完整遷移計劃：`MIGRATION_PLAN.md`
- 🔍 資料庫健康檢查：`DATABASE_HEALTH_CHECK_REPORT.md`

---

**預估總時間**: 約 1-2 小時（視資料量而定）
**建議執行時機**: 非營業時間或系統負載較低時

**開始吧！** 🚀
