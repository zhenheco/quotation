# API 類型對齊策略

## ADDED Requirements

### Requirement: 建立類型守衛函式庫

系統 MUST 建立可重用的類型守衛函式庫，用於驗證和轉換 API 請求體。

#### Scenario: 建立通用的數值轉換守衛

**Given** 多個 API 需要將字串或數值轉換為數值
**When** 建立 `lib/utils/type-guards.ts`
**Then** 提供以下函式:

```typescript
export function parseNumericField(
  value: unknown,
  fieldName: string
): number {
  if (typeof value === 'number') {
    if (isNaN(value)) {
      throw new Error(`Invalid ${fieldName}: must be a number`)
    }
    return value
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) {
      throw new Error(`Invalid ${fieldName}: must be a numeric string`)
    }
    return parsed
  }

  throw new Error(`Invalid ${fieldName}: must be a number or string`)
}

export function parseOptionalNumericField(
  value: unknown,
  fieldName: string
): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return parseNumericField(value, fieldName)
}
```

#### Scenario: 建立雙語欄位轉換守衛

**Given** 多個 API 接受字串或雙語物件
**When** 建立雙語欄位處理函式
**Then** 提供:

```typescript
export interface BilingualText {
  zh: string
  en: string
}

export function parseBilingualField(
  value: unknown,
  fieldName: string
): BilingualText {
  if (typeof value === 'string') {
    return { zh: value, en: value }
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if (typeof obj.zh === 'string' && typeof obj.en === 'string') {
      return { zh: obj.zh, en: obj.en }
    }
  }

  throw new Error(`Invalid ${fieldName}: must be string or {zh, en} object`)
}

export function parseOptionalBilingualField(
  value: unknown,
  fieldName: string
): BilingualText | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return parseBilingualField(value, fieldName)
}
```

### Requirement: API 請求體解析標準流程

所有 API 路由 MUST 遵循統一的請求體解析流程，SHALL 使用類型守衛進行驗證。

#### Scenario: 標準請求體解析步驟

**Given** API 端點接收 POST/PUT 請求
**When** 處理請求
**Then** 遵循以下步驟:

1. 解析 JSON 為 `unknown`:
   ```typescript
   const body = await request.json() as unknown
   ```

2. 驗證是物件:
   ```typescript
   if (typeof body !== 'object' || body === null) {
     return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
   }
   ```

3. 轉型為 Record:
   ```typescript
   const data = body as Record<string, unknown>
   ```

4. 使用類型守衛逐一驗證和轉換欄位:
   ```typescript
   try {
     const validatedData = {
       name: parseBilingualField(data.name, 'name'),
       price: parseNumericField(data.price, 'price'),
       // ...
     }
   } catch (error) {
     return NextResponse.json(
       { error: error instanceof Error ? error.message : 'Validation failed' },
       { status: 400 }
     )
   }
   ```

5. 傳遞驗證後的資料給 DAL:
   ```typescript
   const result = await dalFunction(db, userId, validatedData)
   ```

## MODIFIED Requirements

### Requirement: 統一錯誤處理格式

所有 API 路由的錯誤回應 MUST 使用統一格式，SHALL 提供清晰的錯誤訊息。

#### Scenario: 驗證錯誤回應格式

**Given** API 驗證失敗
**When** 回傳錯誤
**Then** 使用以下格式:
```typescript
return NextResponse.json(
  {
    error: string,           // 使用者可讀的錯誤訊息
    field?: string,          // 發生錯誤的欄位 (若適用)
    code?: string,           // 錯誤代碼 (若需要)
  },
  { status: number }
)
```

#### Scenario: 內部錯誤回應格式

**Given** DAL 或服務層拋出錯誤
**When** API 捕獲錯誤
**Then** 記錄詳細錯誤到 console
**And** 回傳通用錯誤給客戶端
**And** 不洩漏內部實作細節

## 實作注意事項

1. **類型守衛位置**:
   - 建立 `lib/utils/type-guards.ts`
   - 匯出所有可重用的守衛函式
   - 在 API 路由中導入使用

2. **錯誤訊息語言**:
   - 驗證錯誤使用繁體中文
   - 內部日誌使用英文
   - 錯誤代碼使用英文

3. **效能考量**:
   - 類型守衛函式盡量簡潔
   - 避免不必要的深拷貝
   - 提早回傳錯誤

4. **測試策略**:
   - 為類型守衛函式撰寫單元測試
   - 測試邊界情況 (null, undefined, NaN, 空字串等)
   - 確保錯誤訊息清晰
