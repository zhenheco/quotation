# 公司設定 API 類型對齊

## MODIFIED Requirements

### Requirement: CompanyFormData 類型必須在 API 和服務層統一

`app/api/company-settings/route.ts` 使用的 `CompanyFormData` 類型 MUST 與 `lib/services/company.ts` 完全一致。

#### Scenario: POST 請求建立公司時類型正確

**Given** API 路由接收建立公司請求
**And** `lib/services/company.ts` 定義:
```typescript
export interface CompanyFormData {
  name_zh: string
  name_en: string
  tax_id?: string
  bank_name?: string
  bank_account?: string
  bank_code?: string
  address_zh?: string
  address_en?: string
  phone?: string
  email?: string
  website?: string
  logo_url?: string
  signature_url?: string
  passbook_url?: string
}
```

**When** API 呼叫 `createCompany(userId, body)`
**Then** `body` 類型必須為 `CompanyFormData`
**And** 不需要類型斷言
**And** 直接傳遞給 `createCompany`

#### Scenario: PUT 請求更新公司設定時類型正確

**Given** API 路由接收更新公司請求
**When** 解析請求體並提取 `companyId` 和 `data`
**Then** `data` 類型必須為 `Partial<CompanyFormData>` (移除 `companyId`)
**And** 傳遞給 `updateCompany` 時類型匹配

### Requirement: 移除不安全的類型斷言

`app/api/company-settings/route.ts` 第 30 行 SHALL NOT 使用 `as Record<string, unknown> as CompanyFormData` 鏈式斷言。

#### Scenario: 安全地解析和驗證請求體

**Given** API 接收公司設定請求
**When** 解析 JSON 請求體
**Then** 解析為 `unknown`
**And** 使用類型守衛或明確賦值驗證欄位
**And** 建構符合 `CompanyFormData` 的物件
**And** 不使用鏈式 `as` 斷言

**Before**:
```typescript
const body = await request.json() as Record<string, unknown> as CompanyFormData
const company = await createCompany(userId, body)
```

**After**:
```typescript
const body = await request.json() as unknown

// 驗證必填欄位
if (typeof body !== 'object' || body === null) {
  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
}

const data = body as Record<string, unknown>

const companyData: CompanyFormData = {
  name_zh: String(data.name_zh || ''),
  name_en: String(data.name_en || ''),
  tax_id: data.tax_id ? String(data.tax_id) : undefined,
  bank_name: data.bank_name ? String(data.bank_name) : undefined,
  // ... 其他欄位
}

// 驗證必填欄位
if (!companyData.name_zh || !companyData.name_en) {
  return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
}

const company = await createCompany(userId, companyData)
```

## ADDED Requirements

### Requirement: 驗證公司資料完整性

API MUST 驗證公司資料的必填欄位和格式，SHALL 確保資料完整性後再傳遞給服務層。

#### Scenario: 驗證必填欄位存在

**Given** 建立公司請求
**When** 解析請求體
**Then** 驗證 `name_zh` 不為空
**And** 驗證 `name_en` 不為空
**And** 若缺失，回傳 `400 Bad Request`

#### Scenario: 驗證可選欄位格式

**Given** 請求包含 `email` 欄位
**When** 驗證 email 格式
**Then** 確保符合 email 格式
**Or** 回傳格式錯誤訊息

#### Scenario: 驗證可選欄位格式

**Given** 請求包含 `website` 欄位
**When** 驗證 website 格式
**Then** 確保符合 URL 格式
**Or** 回傳格式錯誤訊息

## 實作注意事項

1. **類型導入**:
   - 從 `lib/services/company` 導入 `CompanyFormData`
   - 不需要在 `app/api/types.ts` 重複定義

2. **欄位驗證順序**:
   - 先驗證請求體是物件
   - 再驗證必填欄位
   - 最後驗證可選欄位格式

3. **錯誤訊息**:
   - 明確指出缺失或無效的欄位
   - 使用繁體中文錯誤訊息
