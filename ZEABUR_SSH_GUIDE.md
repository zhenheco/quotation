# Zeabur PostgreSQL SSH 操作指南

## 🎯 目標

在 Zeabur PostgreSQL 容器中執行 SQL 修復 RLS 權限問題。

---

## 📝 您已經 SSH 進入容器

根據您的輸出，您已經在容器內：
```
root@service-68f09dcba21c4059789a53ae-bbb466748-vpbp2:/#
```

---

## ✅ 正確的執行步驟

### 步驟 1: 進入 psql

```bash
# 方法 A: 如果有環境變數
psql $DATABASE_URL

# 方法 B: 如果沒有環境變數，手動連接
psql -U postgres -d quotation_db

# 方法 C: 使用本地 socket
psql postgres
```

執行其中一個，進入 PostgreSQL 互動式 shell。

### 步驟 2: 檢查當前政策

在 `psql` prompt (`quotation_db=#`) 執行：

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'exchange_rates';
```

### 步驟 3: 執行 RLS 修復

複製貼上以下完整 SQL：

```sql
-- 移除舊政策
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;

-- 新增 SELECT 權限
CREATE POLICY "Authenticated users can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- 新增 INSERT 權限
CREATE POLICY "Authenticated users can insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 新增 UPDATE 權限
CREATE POLICY "Authenticated users can update exchange rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true);
```

### 步驟 4: 驗證

```sql
-- 查看所有政策
\dp exchange_rates

-- 或使用 SQL
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'exchange_rates';
```

應該看到 3 個政策。

### 步驟 5: 退出 psql

```sql
\q
```

---

## 🔧 如果遇到問題

### 問題 1: psql command not found

**原因**: PostgreSQL 客戶端未安裝

**解決**:
```bash
# 安裝 postgresql-client
apt-get update && apt-get install -y postgresql-client

# 然後執行 psql
psql postgres
```

### 問題 2: 找不到資料庫

**檢查環境變數**:
```bash
# 查看所有環境變數
env | grep -i postgres
env | grep -i database

# 使用顯示的變數
psql $POSTGRES_URL
# 或
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB
```

### 問題 3: 權限不足

**確認您是 postgres 用戶**:
```bash
whoami

# 如果不是，切換用戶
su - postgres
```

---

## 📋 快速參考指令

### 進入 psql 的各種方式

```bash
# 1. 使用環境變數 (最簡單)
psql $DATABASE_URL

# 2. 本地連接
psql postgres

# 3. 指定所有參數
psql -h localhost -p 5432 -U postgres -d quotation_db

# 4. 從環境變數組合
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB
```

### psql 內常用指令

```sql
-- 列出所有資料庫
\l

-- 連接到特定資料庫
\c quotation_db

-- 列出所有表
\dt

-- 查看表結構
\d exchange_rates

-- 查看表權限
\dp exchange_rates

-- 查看所有 RLS 政策
SELECT * FROM pg_policies;

-- 退出
\q
```

---

## 🚀 完整操作流程（複製貼上）

```bash
# 1. 進入 psql（選擇一個有效的方法）
psql $DATABASE_URL
# 或
psql postgres

# 2. 檢查當前狀態
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'exchange_rates';

# 3. 執行修復
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;

CREATE POLICY "Authenticated users can view exchange_rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert exchange_rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update exchange_rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true);

# 4. 驗證
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'exchange_rates';

# 5. 退出
\q
```

---

## ✅ 成功標準

執行完成後，您應該看到：

```
        tablename        |                policyname                 | cmd
-------------------------+------------------------------------------+--------
 exchange_rates | Authenticated users can view exchange_rates  | SELECT
 exchange_rates | Authenticated users can insert exchange_rates| INSERT
 exchange_rates | Authenticated users can update exchange_rates| UPDATE
(3 rows)
```

---

## 🧪 測試

退出 SSH 後，回到本地測試：

```bash
# 測試同步
curl -X POST http://localhost:3000/api/exchange-rates/sync \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency":"USD"}'

# 應該返回
# {"success": true, "message": "匯率同步成功"}

# 測試獲取
curl http://localhost:3000/api/exchange-rates | jq '.rates'

# 應該看到真實匯率（不是全部 1）
```

---

## 📞 需要協助？

如果仍然有問題，請提供：

1. `env | grep -i postgres` 的輸出
2. `psql --version` 的輸出
3. 您使用的 psql 連接指令
4. 錯誤訊息完整內容

---

**重要**:
- 所有 SQL 指令必須在 `psql` 內執行，不能在 bash shell 執行
- SQL 指令結尾記得加分號 `;`
- 多行 SQL 可以直接貼上，psql 會自動處理

祝順利！🚀
