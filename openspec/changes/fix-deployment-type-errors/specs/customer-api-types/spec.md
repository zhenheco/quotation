# 客戶 API 類型對齊

## MODIFIED Requirements

### Requirement: UpdateCustomerRequest 必須與 DAL updateCustomer 參數對齊

`app/api/types.ts` 中的 `UpdateCustomerRequest` 類型 MUST 完全符合 DAL `updateCustomer` 函式期望的參數類型。

#### Scenario: 更新客戶資料時類型匹配

**Given** DAL `updateCustomer` 函式期望:
```typescript
data: Partial<{
  name: { zh: string; en: string }
  email: string
  phone: string
  address: { zh: string; en: string }
  tax_id: string
  contact_person: { zh: string; en: string }
  company_id: string
}>
```

**When** API 路由呼叫 `updateCustomer(db, userId, id, body)`
**Then** `body` 必須符合上述類型
**And** 雙語欄位必須是物件 `{ zh: string, en: string }`
**And** 不能是字串類型
**And** 可選欄位可以是 `undefined` 或相應類型

#### Scenario: API 請求體轉換為 DAL 參數

**Given** 前端可能發送:
```json
{
  "name": "客戶名稱",
  "email": "customer@example.com"
}
```

**When** API 路由處理請求
**Then** 若 `name` 是字串，必須轉換為 `{ zh: name, en: name }`
**And** 若 `name` 已是物件，直接使用
**And** 確保傳遞給 DAL 的類型正確

### Requirement: 移除不安全的類型斷言

`app/api/customers/[id]/route.ts` SHALL NOT 使用 `as Record<string, unknown> as UpdateCustomerRequest` 鏈式斷言。

#### Scenario: 安全地解析請求體

**Given** API 接收更新客戶請求
**When** 解析 JSON 請求體
**Then** 解析為 `Record<string, unknown>`
**And** 逐一檢查和轉換欄位
**And** 建立符合 DAL 類型的物件
**And** 不使用鏈式 `as` 斷言

**Before**:
```typescript
const body = await request.json() as Record<string, unknown> as UpdateCustomerRequest
const customer = await updateCustomer(db, user.id, id, body)  // 類型錯誤
```

**After**:
```typescript
const body = await request.json() as Record<string, unknown>

const updateData: Partial<{
  name: { zh: string; en: string }
  email: string
  phone: string
  address: { zh: string; en: string }
  tax_id: string
  contact_person: { zh: string; en: string }
  company_id: string
}> = {}

if (body.name !== undefined) {
  updateData.name = typeof body.name === 'string'
    ? { zh: body.name, en: body.name }
    : body.name as { zh: string; en: string }
}

if (body.email !== undefined) {
  updateData.email = String(body.email)
}

// ... 其他欄位

const customer = await updateCustomer(db, user.id, id, updateData)
```

## ADDED Requirements

### Requirement: 支援雙語欄位的彈性輸入

客戶 API MUST 支援前端發送字串或雙語物件作為 `name`、`address`、`contact_person` 欄位。

#### Scenario: 接受字串作為雙語輸入

**Given** 前端發送 `{ "name": "王小明" }`
**When** API 處理請求
**Then** 將 `name` 轉換為 `{ zh: "王小明", en: "王小明" }`
**And** 儲存到資料庫

#### Scenario: 接受物件作為雙語輸入

**Given** 前端發送 `{ "name": { "zh": "王小明", "en": "Wang Xiaoming" } }`
**When** API 處理請求
**Then** 直接使用該物件
**And** 儲存到資料庫

## 實作注意事項

1. **類型定義位置**:
   - `app/api/types.ts` 定義 API 請求類型 (寬鬆)
   - `lib/dal/customers.ts` 定義 DAL 參數類型 (嚴格)
   - API 層負責轉換

2. **向後相容性**:
   - 支援現有前端發送字串格式
   - 同時支援新的雙語物件格式

3. **驗證策略**:
   - 驗證雙語物件包含 `zh` 和 `en` 欄位
   - Email 格式驗證
   - Phone 格式驗證 (可選)
