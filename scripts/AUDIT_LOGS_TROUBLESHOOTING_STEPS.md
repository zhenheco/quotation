# Audit Logs 測試故障排除步驟

## 當前狀態
- ✅ 認證成功（2/2 測試通過）
- ❌ 稽核日誌建立失敗
- ❌ 錯誤訊息 1：`Could not find the 'new_values' column of 'audit_logs' in the schema cache`
- ❌ 錯誤訊息 2：`column "table_name" of relation "audit_logs" does not exist`

## 問題診斷

### 確認的問題
**audit_logs 表不存在或結構不完整**
- Migration 001 可能沒有執行
- 或表被刪除/修改過

## 修復步驟

### 步驟 1: 確認表是否存在 ⚠️ **請先執行此步驟**
在 Supabase Dashboard 的 SQL Editor 中執行：
```sql
-- 執行檔案：scripts/CHECK_AUDIT_LOGS_EXISTS.sql
```

**可能的結果**:
- **情況 A**: `table_exists = false` → 表不存在，執行步驟 2
- **情況 B**: `table_exists = true` 但欄位列表為空或不完整 → 表結構錯誤，執行步驟 2
- **情況 C**: `table_exists = true` 且有完整欄位 → Schema cache 問題，執行步驟 4

### 步驟 2: 建立 audit_logs 表（如果不存在或結構錯誤）
在 Supabase Dashboard 的 SQL Editor 中執行：
```sql
-- 執行檔案：scripts/CREATE_AUDIT_LOGS_TABLE.sql
```

**此腳本會**:
- 建立 audit_logs 表（包含所有必要欄位）
- 建立所有索引
- 啟用 RLS 並建立策略
- 驗證建立結果

**預期結果**:
- 應該看到 "audit_logs 表已建立"
- policy_count = 3
- 欄位列表包含：id, user_id, table_name, record_id, action, old_values, new_values, ip_address, user_agent, created_at

### 步驟 3: 重新測試
執行測試腳本：
```bash
npx tsx scripts/test-audit-logs.ts
```

## 額外選項：刷新 Supabase Schema Cache

如果表結構正確但仍然出現 "column not found in schema cache" 錯誤：

1. 在 Supabase Dashboard 中：
   - 前往 Project Settings → Database
   - 點擊 "Reset Database Schema Cache"

2. 或者在 SQL Editor 中執行：
```sql
NOTIFY pgrst, 'reload schema';
```

3. 等待幾秒鐘後重新測試

## 立即行動 ⚠️

**請執行步驟 1**：
在 Supabase Dashboard SQL Editor 中執行 **`scripts/CHECK_AUDIT_LOGS_EXISTS.sql`**

並提供執行結果的截圖，特別是：
1. `table_exists` 的值（true 或 false）
2. 欄位列表（如果表存在）
3. 所有表的列表

這將幫助確定下一步：
- 如果 `table_exists = false` → 執行步驟 2 建立表
- 如果表存在但欄位不完整 → 執行步驟 2 重建表
