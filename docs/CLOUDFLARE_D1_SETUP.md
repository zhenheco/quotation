# Cloudflare D1 資料庫設定指南

## 前置條件

確保你的 Cloudflare API Token 具有以下權限：
- Account → D1 → Edit
- User → User Details → Read
- User → Memberships → Read

## 步驟 1: 建立 D1 資料庫

```bash
npx wrangler d1 create quotation-system-db
```

執行後會看到類似輸出：
```
✅ Successfully created DB 'quotation-system-db'

[[d1_databases]]
binding = "DB"
database_name = "quotation-system-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## 步驟 2: 更新 wrangler.jsonc

將上述輸出的配置加入 `wrangler.jsonc`：

```jsonc
{
  "name": "quotation-system",
  // ... 其他配置 ...
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "quotation-system-db",
      "database_id": "your-database-id-here"
    }
  ]
}
```

## 步驟 3: 執行初始 schema

### 本地測試

```bash
npx wrangler d1 execute quotation-system-db --local --file=./migrations/d1/001_initial_schema.sql
```

### 部署到遠端

```bash
npx wrangler d1 execute quotation-system-db --remote --file=./migrations/d1/001_initial_schema.sql
```

## 步驟 4: 驗證資料庫

### 本地驗證

```bash
npx wrangler d1 execute quotation-system-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 遠端驗證

```bash
npx wrangler d1 execute quotation-system-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

應該看到所有表：
- roles
- permissions
- role_permissions
- user_roles
- companies
- company_members
- customers
- products
- quotations
- quotation_items
- quotation_shares
- quotation_versions
- customer_contracts
- payments
- exchange_rates
- audit_logs

## 步驟 5: 測試查詢

```bash
# 查看角色
npx wrangler d1 execute quotation-system-db --local --command="SELECT * FROM roles;"

# 查看權限
npx wrangler d1 execute quotation-system-db --local --command="SELECT * FROM permissions LIMIT 5;"

# 查看匯率
npx wrangler d1 execute quotation-system-db --local --command="SELECT * FROM exchange_rates;"
```

## 故障排除

### 錯誤：Authentication error [code: 10000]

**原因**: API Token 權限不足

**解決方案**:
1. 前往 https://dash.cloudflare.com/profile/api-tokens
2. 編輯現有 token 或建立新 token
3. 確保包含以下權限：
   - Account → D1 → Edit
   - User → User Details → Read
   - User → Memberships → Read
4. 更新環境變數：
   ```bash
   export CLOUDFLARE_API_TOKEN=your-new-token
   ```

### 錯誤：Table already exists

**原因**: Schema 已經執行過

**解決方案**: 使用 `DROP TABLE IF EXISTS` 或忽略錯誤（schema 使用 `IF NOT EXISTS`）

### 錯誤：Foreign key constraint failed

**原因**: SQLite 外鍵約束

**解決方案**: 確保先插入父表資料再插入子表資料

## 下一步

完成 D1 設定後：
1. 建立 D1 客戶端抽象層 (`lib/db/d1-client.ts`)
2. 建立資料存取層 (DAL) (`lib/dal/`)
3. 建立 KV 快取層 (`lib/cache/`)
4. 更新服務層使用 D1
5. 資料遷移
