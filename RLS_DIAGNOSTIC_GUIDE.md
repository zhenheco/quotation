# 🔍 RLS 診斷指南

**目標**：診斷並修復 Row Level Security 策略問題

**目前狀況**：
- ✅ 使用者可以成功登入
- ❌ 登入後無法插入資料（被 RLS 阻擋）
- 錯誤訊息：`permission denied for table customers` (Code: 42501)

---

## 📋 執行步驟

### 步驟 1: 檢查目前狀態

**在 Supabase Dashboard > SQL Editor 執行**：

📄 檔案：`scripts/check-actual-schema.sql`

**這個腳本會顯示**：
1. customers 表的所有欄位
2. products 表的所有欄位
3. RLS 是否啟用
4. 現有的 RLS 策略

**請複製整個結果並回報**（或截圖）

---

### 步驟 2: 修復 RLS 策略

**在 Supabase Dashboard > SQL Editor 執行**：

📄 檔案：`scripts/FIX_RLS_POLICIES.sql`

**這個腳本會**：
1. 刪除現有的錯誤策略
2. 重新建立正確的策略（加上 `TO authenticated`）
3. 驗證策略是否正確建立

**執行後會顯示策略列表，請回報結果**

---

## 🎯 需要回報的資訊

### 從步驟 1 (check-actual-schema.sql)：

**問題 1**: RLS 是否啟用？
```
customers | rls_enabled: true/false?
products  | rls_enabled: true/false?
```

**問題 2**: 有多少個策略？
```
預期：customers 應該有 4 個策略 (SELECT, INSERT, UPDATE, DELETE)
預期：products 應該有 4 個策略 (SELECT, INSERT, UPDATE, DELETE)
實際：___ 個
```

**問題 3**: 策略的 roles 欄位是什麼？
```
預期：{authenticated}
實際：___
```

**問題 4**: 策略的 cmd 欄位？
```
應該包含：SELECT, INSERT, UPDATE, DELETE
實際：___
```

### 從步驟 2 (FIX_RLS_POLICIES.sql)：

**問題 5**: 修復後有多少個策略？
```
customers: ___ 個策略
products:  ___ 個策略
```

**問題 6**: 是否有任何錯誤訊息？
```
有/無，錯誤內容：___
```

---

## 📊 診斷參考

### 正常的 RLS 狀態應該是：

```sql
-- RLS 啟用狀態
tablename  | rls_enabled
-----------|------------
customers  | true
products   | true

-- 策略列表（每個表 4 個）
tablename  | policyname                              | roles            | cmd
-----------|----------------------------------------|------------------|--------
customers  | Users can view their own customers     | {authenticated}  | SELECT
customers  | Users can insert their own customers   | {authenticated}  | INSERT
customers  | Users can update their own customers   | {authenticated}  | UPDATE
customers  | Users can delete their own customers   | {authenticated}  | DELETE
products   | Users can view their own products      | {authenticated}  | SELECT
products   | Users can insert their own products    | {authenticated}  | INSERT
products   | Users can update their own products    | {authenticated}  | UPDATE
products   | Users can delete their own products    | {authenticated}  | DELETE
```

### 常見問題：

❌ **問題 1**: `roles` 欄位不是 `{authenticated}`
- **原因**：策略建立時缺少 `TO authenticated`
- **解決**：執行 `FIX_RLS_POLICIES.sql`

❌ **問題 2**: 策略數量不足（少於 4 個）
- **原因**：部分策略建立失敗
- **解決**：執行 `FIX_RLS_POLICIES.sql`

❌ **問題 3**: RLS 啟用但沒有策略
- **原因**：策略完全沒有建立
- **解決**：執行 `FIX_RLS_POLICIES.sql`

---

## ⚡ 快速檢查命令

如果你想快速檢查，可以單獨執行這個查詢：

```sql
-- 快速檢查 RLS 狀態和策略數量
SELECT
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*)
   FROM pg_policies
   WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'products');
```

**預期結果**：
```
tablename  | rls_enabled | policy_count
-----------|-------------|-------------
customers  | true        | 4
products   | true        | 4
```

---

## 🔄 完成後

執行完兩個腳本後：

1. **回報上述 6 個問題的答案**
2. 我會立即重新執行 CRUD 測試
3. 如果還有問題，我們會根據你的回報繼續診斷

---

**準備好了嗎？** 🚀

開始執行步驟 1：`scripts/check-actual-schema.sql`
