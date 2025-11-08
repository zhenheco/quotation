# product-form-submission Specification

## Purpose
TBD - created by archiving change fix-product-quotation-save-bugs. Update Purpose after archive.
## Requirements
### Requirement: 產品表單送出處理

產品建立/編輯表單 MUST 能正確處理使用者送出動作，包含資料驗證、API 呼叫、錯誤處理和成功回饋。

#### Scenario: 建立新產品 - 成功路徑
```gherkin
Given 使用者在產品建立頁面
And 已填寫必填欄位（中英文名稱、基本價格、幣別）
When 使用者點擊「儲存」按鈕
Then 表單資料送出到 POST /api/products
And 資料庫新增一筆產品記錄
And 顯示「產品已建立」成功 toast
And 頁面導向產品列表
```

#### Scenario: 編輯現有產品 - 成功路徑
```gherkin
Given 使用者在產品編輯頁面
And 表單已載入現有產品資料
When 使用者修改產品資訊並點擊「儲存」
Then 表單資料送出到 PUT /api/products/{id}
And 資料庫更新產品記錄
And 顯示「產品已更新」成功 toast
And 頁面導向產品列表
```

#### Scenario: 表單驗證失敗
```gherkin
Given 使用者在產品建立頁面
And 必填欄位未填寫完整
When 使用者點擊「儲存」按鈕
Then 顯示欄位驗證錯誤訊息
And 不送出表單到 API
And 使用者停留在當前頁面
```

#### Scenario: API 錯誤處理
```gherkin
Given 使用者填寫完整表單
When 使用者點擊「儲存」並且 API 回傳錯誤
Then 顯示錯誤 toast 通知
And 使用者停留在當前頁面
And 表單資料保留（不清空）
```

#### Scenario: 成本價格權限控制
```gherkin
Given 使用者沒有 'write_cost' 權限
When 使用者嘗試填寫成本價格欄位
Then 成本價格欄位為唯讀或隱藏
And 送出表單時不包含成本價格資料
```

---

### Requirement: API 請求格式驗證

API MUST 正確接收並驗證產品建立/更新請求。

#### Scenario: 正確的請求格式
```gherkin
Given 前端送出產品建立請求
When POST /api/products 收到請求
Then request body 包含以下欄位：
  | 欄位 | 類型 | 必填 | 說明 |
  | name | BilingualText | 是 | { zh: string, en: string } |
  | base_price | number | 是 | 基本價格 |
  | base_currency | string | 是 | 基本幣別 |
  | description | BilingualText | 否 | { zh: string, en: string } |
  | category | string | 否 | 產品分類 |
  | cost_price | number | 否 | 成本價格（需權限） |
  | cost_currency | string | 否 | 成本幣別 |
  | profit_margin | number | 否 | 利潤率 |
  | supplier | string | 否 | 供應商 |
  | supplier_code | string | 否 | 供應商編號 |
  | sku | string | 否 | SKU |
```

#### Scenario: 驗證必填欄位
```gherkin
Given API 收到產品建立請求
When request body 缺少必填欄位
Then 回傳 400 Bad Request
And response body 包含 { error: "Name, base_price and base_currency are required" }
```

#### Scenario: 驗證價格格式
```gherkin
Given API 收到產品建立請求
When base_price 不是有效數字或為負數
Then 回傳 400 Bad Request
And response body 包含 { error: "Invalid price" }
```

---

### Requirement: 資料庫寫入一致性

產品資料 MUST 正確寫入 Supabase 資料庫，符合 schema 定義。

#### Scenario: 新增產品到資料庫
```gherkin
Given API 接收到有效的產品建立請求
When 執行資料庫 INSERT 操作
Then products 表新增一筆記錄，包含：
  | 欄位 | 值來源 | 說明 |
  | id | 自動生成 | UUID |
  | user_id | 當前認證使用者 | 來自 auth.getUser() |
  | name | request.name | JSONB 格式 |
  | description | request.description | JSONB 格式，可為 null |
  | base_price | request.base_price | numeric |
  | base_currency | request.base_currency | text |
  | category | request.category | text，可為 null |
  | cost_price | request.cost_price | numeric，可為 null |
  | cost_currency | request.cost_currency | text，可為 null |
  | profit_margin | request.profit_margin | numeric，可為 null |
  | supplier | request.supplier | text，可為 null |
  | supplier_code | request.supplier_code | text，可為 null |
  | sku | request.sku | text，可為 null |
  | created_at | 自動生成 | timestamptz |
  | updated_at | 自動生成 | timestamptz |
```

#### Scenario: RLS 政策驗證
```gherkin
Given 使用者 A 嘗試建立產品
When 資料庫執行 RLS 檢查
Then user_id 設定為使用者 A 的 ID
And 使用者 A 可以成功建立產品
And 使用者 B 無法查詢到使用者 A 的產品
```

---

### Requirement: React Query 狀態同步

前端 MUST 使用 React Query 正確管理產品資料的快取和狀態。

#### Scenario: 建立產品後更新快取
```gherkin
Given 使用者成功建立新產品
When API 回傳新產品資料
Then React Query invalidate ['products'] query
And ['products', newProduct.id] query 設定為新產品資料
And 產品列表自動重新載入
```

#### Scenario: 編輯產品後更新快取
```gherkin
Given 使用者成功更新產品
When API 回傳更新後的產品資料
Then React Query invalidate ['products'] query
And ['products', productId] query 更新為新資料
And 產品列表顯示最新資料
```

---

### Requirement: 錯誤回饋機制

使用者操作過程中的任何錯誤 MUST 提供清晰的回饋。

#### Scenario: 顯示成功訊息
```gherkin
Given 產品建立/更新成功
Then 顯示 toast 通知
And toast 內容為「產品已建立」或「產品已更新」
And toast 類型為 success
And toast 自動在 3 秒後消失
```

#### Scenario: 顯示驗證錯誤
```gherkin
Given 表單驗證失敗
Then 在對應欄位下方顯示錯誤訊息
And 錯誤訊息使用紅色文字
And 錯誤欄位邊框變為紅色
```

#### Scenario: 顯示 API 錯誤
```gherkin
Given API 回傳錯誤
Then 顯示 error toast
And toast 內容包含錯誤訊息（從 API response.error 取得）
And 在 console 記錄完整錯誤資訊
```

