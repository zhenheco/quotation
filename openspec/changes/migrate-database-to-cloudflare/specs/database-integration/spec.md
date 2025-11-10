# database-integration Spec Deltas

## MODIFIED Requirements

### Requirement: 資料庫連接與查詢

所有資料庫操作 MUST 透過 Cloudflare D1 執行，使用 SQLite 語法，並透過統一的資料存取層（DAL）。

#### Scenario: D1 客戶端初始化
```gherkin
Given Workers 環境中有 D1 binding
When 應用初始化
Then 建立 D1Client 實例
And 使用 env.DB 連接資料庫
```

#### Scenario: 查詢資料使用 SQLite 語法
```gherkin
Given 需要查詢客戶列表
When 執行資料庫查詢
Then 使用 D1Client.query() 方法
And 使用 SQLite 語法（非 PostgreSQL）
And 參數化查詢使用 bind()
```

#### Scenario: JSON 欄位處理
```gherkin
Given 資料表包含 JSON 欄位（如 name: {"zh": "...", "en": "..."}）
When 從 D1 讀取資料
Then 欄位儲存為 TEXT 類型
And 應用層使用 JSON.parse() 解析
When 寫入資料到 D1
Then 使用 JSON.stringify() 序列化
```

#### Scenario: UUID 處理
```gherkin
Given 需要產生新記錄 ID
When 建立記錄
Then 使用 crypto.randomUUID() 產生 UUID
And 儲存為 TEXT 類型（非 PostgreSQL UUID）
```

---

### Requirement: 資料存取層（DAL）抽象

所有資料庫操作 MUST 透過 DAL 函式執行，確保一致性和可測試性。

#### Scenario: 使用 DAL 查詢客戶
```gherkin
Given 需要取得使用者的客戶列表
When 呼叫服務層函式
Then 使用 customersDal.getCustomers(db, userId)
And 不直接寫 SQL 在服務層
```

#### Scenario: 使用 DAL 建立資料
```gherkin
Given 需要建立新客戶
When 呼叫 customersDal.createCustomer(db, data, userId)
Then DAL 處理 UUID 產生
And DAL 處理 JSON 序列化
And DAL 執行 INSERT 語句
And 回傳完整的客戶物件
```

#### Scenario: DAL 型別安全
```gherkin
Given DAL 函式定義
When TypeScript 編譯
Then 所有參數有明確型別
And 回傳值有明確型別
And 使用 interface 定義實體結構
```

---

### Requirement: 資料庫 Schema 遷移

Schema 變更 MUST 透過版本化的 migration 檔案執行。

#### Scenario: 初始 Schema 建立
```gherkin
Given 全新的 D1 資料庫
When 執行 migrations/d1/001_initial_schema.sql
Then 建立 17 張業務表
And 建立必要的索引
And 不包含 PostgreSQL 特定語法
```

#### Scenario: Schema 使用 SQLite 型別
```gherkin
Given migration 檔案
When 定義資料表
Then 使用 TEXT 替代 UUID
And 使用 TEXT 替代 JSONB
And 使用 REAL 替代 DECIMAL
And 使用 TEXT 替代 TIMESTAMP（ISO-8601 格式）
And 移除 PostgreSQL REFERENCES（改用應用層檢查）
```

#### Scenario: 索引策略
```gherkin
Given 需要查詢效能優化
When 建立索引
Then 為 user_id 建立索引（所有使用者資料表）
And 為 created_at 建立索引（時間排序查詢）
And 為外鍵欄位建立索引（如 customer_id, product_id）
```

---

## ADDED Requirements

### Requirement: KV 快取整合

高頻讀取的資料 MUST 使用 Cloudflare KV 快取，減少 D1 查詢次數。

#### Scenario: 快取匯率資料
```gherkin
Given 需要查詢匯率
When 呼叫 getExchangeRate(from, to, date)
Then 先檢查 KV: exchange_rate:{from}:{to}:{date}
If KV 命中
  Then 直接回傳快取值（1-2ms）
If KV 未命中
  Then 從 D1 查詢（30-50ms）
  And 寫入 KV，TTL 24 小時
  And 回傳查詢結果
```

#### Scenario: 快取使用者權限
```gherkin
Given 需要檢查使用者權限
When 呼叫 getUserPermissions(userId)
Then 先檢查 KV: user_permissions:{userId}
If KV 命中
  Then 直接回傳權限物件（1-2ms）
If KV 未命中
  Then 從 D1 查詢（需要 3-5 次 JOIN）
  And 組合權限物件
  And 寫入 KV，TTL 1 小時
  And 回傳權限物件
```

#### Scenario: 快取失效
```gherkin
Given 管理員變更使用者角色
When 執行 updateUserRole(userId, newRoleId)
Then 更新 D1 資料表
And 立即刪除 KV: user_permissions:{userId}
And 下次查詢時重新從 D1 載入
```

#### Scenario: 快取公司設定
```gherkin
Given 需要產生 PDF
When 呼叫 getCompanyById(companyId)
Then 先檢查 KV: company:{companyId}
If KV 命中
  Then 回傳公司設定（含 logo、銀行帳戶等）
If KV 未命中
  Then 從 D1 查詢
  And 寫入 KV，TTL 2 小時
```

---

### Requirement: 資料遷移工具

從 Supabase PostgreSQL 遷移資料到 D1 MUST 使用自動化腳本。

#### Scenario: 導出 Supabase 資料
```gherkin
Given Supabase 資料庫包含業務資料
When 執行導出腳本
Then 使用 pg_dump 導出 17 張表
And 只導出資料（--data-only）
And 儲存為 supabase-data-backup.sql
```

#### Scenario: 轉換 PostgreSQL 到 SQLite
```gherkin
Given PostgreSQL dump 檔案
When 執行 scripts/convert-pg-to-d1.ts
Then 移除 PostgreSQL 特定語法
And 轉換 COPY 為 INSERT
And 處理 JSONB → TEXT
And 處理 UUID → TEXT
And 處理 TIMESTAMP → TEXT (ISO-8601)
And 輸出 d1-data-import.sql
```

#### Scenario: 導入 D1 資料庫
```gherkin
Given 轉換後的 SQL 檔案
When 執行 wrangler d1 execute --remote --file=./d1-data-import.sql
Then 資料導入 D1
And 驗證記錄數與 Supabase 一致
```

---

## REMOVED Requirements

### Requirement: 資料庫 RLS 正確設定

**原因**: Cloudflare D1 不支援 Row Level Security，改用應用層權限檢查。

**遷移策略**:
- 在 DAL 層強制加入 user_id 過濾
- 在 API 路由層檢查權限（使用 KV 快取的權限物件）
- 使用 TypeScript 型別確保所有查詢都包含 user_id

#### Scenario: 應用層權限檢查
```gherkin
Given 使用者 A 呼叫 GET /api/products
When API 路由處理請求
Then 從 JWT 取得 userId
And 檢查權限: getUserPermissions(userId)
If 有 'read:products' 權限
  Then 呼叫 productsDal.getProducts(db, userId)
  And DAL 自動加入 WHERE user_id = ?
  And 只回傳該使用者的產品
Else
  Then 回傳 403 Forbidden
```
