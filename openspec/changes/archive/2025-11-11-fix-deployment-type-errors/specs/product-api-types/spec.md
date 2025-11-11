# 產品 API 類型對齊

## ADDED Requirements

### Requirement: 產品 API 請求體必須支援彈性數值類型

API 端點接收 JSON 請求時，數值欄位可能以字串或數值形式傳遞。系統 MUST 支援兩種類型，請求體介面 SHALL 允許 `number | string` 類型。

#### Scenario: 建立產品時接受字串或數值價格

**Given** 前端發送建立產品請求
**And** `base_price` 可能是 `"1000"` (字串) 或 `1000` (數值)
**When** 伺服器接收請求體
**Then** `CreateProductRequestBody` 介面必須允許 `base_price: number | string`
**And** API 內部使用 `parseFloat()` 轉換為數值
**And** 驗證轉換結果是否為有效數字

#### Scenario: 更新產品時接受彈性數值類型

**Given** 前端發送更新產品請求
**And** 可選數值欄位 (`base_price`, `cost_price`, `profit_margin`) 可能為字串或數值
**When** 伺服器處理請求
**Then** `UpdateProductRequestBody` 介面必須允許這些欄位為 `number | string | undefined`
**And** 僅在欄位存在時執行 `parseFloat()` 轉換
**And** 轉換後再傳遞給 DAL 函式

### Requirement: DAL 函式只接受嚴格類型的參數

DAL 層函式 MUST 接收已驗證和轉換後的強類型參數，SHALL NOT 處理原始請求資料。

#### Scenario: createProduct 接收已轉換的數值

**Given** API 路由已驗證和轉換請求體
**When** 呼叫 `createProduct(db, userId, data)`
**Then** `data.base_price` 必須是 `number` 類型
**And** `data.cost_price` 必須是 `number | undefined`
**And** `data.profit_margin` 必須是 `number | undefined`
**And** DAL 不需要再次驗證或轉換

#### Scenario: updateProduct 接收正確的 Partial 類型

**Given** API 路由準備更新資料
**When** 呼叫 `updateProduct(db, userId, productId, data)`
**Then** `data` 類型必須符合 `Partial<Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>>`
**And** 所有數值欄位必須是 `number` 類型 (不是 `string`)
**And** 雙語欄位必須是 `{ zh: string; en: string }` 結構

## MODIFIED Requirements

### Requirement: 移除不安全的類型斷言

API 路由 SHALL NOT 使用 `as Record<string, unknown> as RequestType` 鏈式斷言。

#### Scenario: 使用類型守衛替代斷言

**Given** API 需要解析請求體
**When** 接收 JSON 請求
**Then** 首先解析為 `unknown`
**And** 使用類型守衛函式驗證欄位
**Or** 明確賦值並進行類型檢查
**And** 不使用雙重 `as` 斷言

**Before**:
```typescript
const body = await request.json() as Record<string, unknown> as CreateProductRequestBody
```

**After**:
```typescript
const body = await request.json() as Record<string, unknown>

const basePrice = typeof body.base_price === 'number'
  ? body.base_price
  : parseFloat(String(body.base_price))
```

## 實作注意事項

1. **數值驗證順序**:
   - 先檢查欄位是否存在 (`!== undefined`)
   - 再轉換類型 (`parseFloat()`)
   - 最後驗證範圍 (`isNaN()`, `< 0`)

2. **錯誤訊息清晰化**:
   - 區分「欄位缺失」和「欄位無效」錯誤
   - 回傳明確的欄位名稱

3. **型別兼容性**:
   - API 請求介面寬鬆 (`number | string`)
   - DAL 函式介面嚴格 (`number`)
   - API 層負責轉換和驗證
