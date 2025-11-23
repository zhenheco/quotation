# Supabase 資料庫設定指南

## 方法一：完整腳本（推薦）

1. 前往 **Supabase Dashboard** → **SQL Editor**
2. 執行以下檔案內容：
   ```bash
   cat migrations/SUPABASE_INIT_ALL.sql
   ```
3. 全選複製，貼上到 SQL Editor
4. 點擊 **Run**

**警告**：此檔案較大（124KB），如果 SQL Editor 有限制，請使用方法二。

---

## 方法二：分批執行（如果方法一失敗）

依序執行以下檔案：

### 1. 核心 Schema（必須）
```bash
cat migrations/000_initial_schema.sql
```

### 2. RBAC 和功能擴充（必須）
```bash
cat migrations/001_rbac_and_new_features.sql
```

### 3. RBAC 修正（必須）
```bash
cat migrations/002_rbac_fixed.sql
```

### 4. 多公司架構（必須）
```bash
cat migrations/003_multi_company_architecture.sql
```

### 5. 合約和付款增強（必須）
```bash
cat migrations/004_contracts_and_payments_enhancement.sql
```

### 6-19. 其他增強功能（可選，但建議全部執行）
```bash
# 依序執行 006-019 的 migration 檔案
```

---

## 驗證資料庫設定

執行完成後，在 SQL Editor 執行：

```sql
-- 檢查所有 tables 是否建立
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 應該看到至少以下 tables:
-- - customers
-- - products
-- - quotations
-- - quotation_items
-- - payment_terms
-- - payments
-- - roles
-- - permissions
-- - role_permissions
-- - user_roles
-- - user_profiles
-- - company_settings
-- - companies
-- - company_members
```

---

## 建立第一個使用者

在 SQL Editor 執行：

```sql
-- 建立測試用戶（替換為您的實際 email）
INSERT INTO user_profiles (user_id, full_name, display_name, is_active)
VALUES (
  gen_random_uuid(),
  'Test Admin',
  'Admin',
  true
)
RETURNING user_id;

-- 記下返回的 user_id，後續建立測試資料時會用到
```

---

## 下一步

資料庫設定完成後，執行：

```bash
# 建立測試資料
pnpm exec tsx scripts/seed-payment-test-data.ts
```
