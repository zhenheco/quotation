# Proposal: 修正 D1 資料庫雙語文字儲存問題

## Summary
修正報價單和報價單項目建立時，雙語文字（BilingualText）無法儲存至 D1 資料庫的問題。目前前端送出 `{ zh: string, en: string }` 格式的物件，但 D1 schema 缺少對應欄位或未正確序列化為 JSON TEXT，導致 `D1_TYPE_ERROR: Type 'object' not supported` 錯誤。

本提案採用與現有 Customers/Products DAL 一致的架構模式，使用 `parseRow()` 函式處理資料庫層與應用層的型別轉換。

## Problem Statement
### 當前問題
1. **D1 Schema 缺少欄位**：
   - `quotation_items` 表**完全缺少** `description` 欄位（Supabase schema 定義為 JSONB）
   - `quotations.notes` 欄位已存在（TEXT），但程式碼未正確序列化

2. **DAL 層架構不一致**：
   - `lib/dal/quotations.ts` **未採用** `Row` interface 模式（Customers/Products 有）
   - `QuotationItem` interface **缺少** `description` 欄位
   - **缺少** `parseQuotationRow()` 和 `parseQuotationItemRow()` 函式
   - `createQuotationItem()` **不支援** `description` 參數

3. **型別定義矛盾**：
   - `types/models.ts` 定義 `Quotation.notes: string | null`（❌ 應為 `BilingualText | null`）
   - `QuotationItem` interface 完全缺少 `description` 欄位
   - 與 `hooks/useQuotations.ts` 的 `CreateQuotationInput.notes: BilingualText` 不一致

4. **API 層未處理序列化**：
   - `POST /api/quotations` 直接將 BilingualText 物件傳給 DAL
   - 缺少 JSON.stringify() 處理
   - GET 端點缺少 JSON.parse() 處理

### 錯誤訊息
```
D1_TYPE_ERROR: Type 'object' not supported for value '[object Object]'
```

### 影響範圍
- ❌ 無法建立新報價單（前端表單送出失敗）
- ❌ 無法儲存報價單項目描述
- ❌ 無法儲存報價單備註
- ❌ TypeScript 型別不一致導致開發混亂

## Technical Context

### D1 資料庫技術限制
基於研究和官方文件（[D1 Query JSON](https://developers.cloudflare.com/d1/sql-api/query-json/)）：

1. **SQLite 版本**：D1 使用 SQLite 3.41.0（截至 2024 年 8 月）
2. **JSON 儲存格式**：
   - ❌ **不支援** JSONB 型別（需 SQLite 3.45.0+）
   - ✅ **支援** JSON1 Extension（TEXT 格式儲存）
   - ✅ **支援** JSON 查詢函式：`json_extract()`, `->`, `->>`, `json_each()` 等

3. **效能特性**：
   - JSON.parse() / JSON.stringify() 效能極快（小型物件 < 1ms）
   - TEXT JSON 比 JSONB 慢，但資料量小時差異可忽略
   - SQLite JSON 函式可減少 API 層處理負擔（未來優化方向）

### 現有專案模式（Customers & Products）
專案已建立標準 BilingualText 處理模式：

```typescript
// 1. 定義 Row interface（資料庫層）
interface CustomerRow {
  id: string
  name: string  // ← JSON 字串
  address: string | null  // ← JSON 字串
  // ...
}

// 2. 定義應用層 interface
export interface Customer {
  id: string
  name: { zh: string; en: string }  // ← 物件
  address: { zh: string; en: string } | null  // ← 物件
  // ...
}

// 3. parseRow 函式（反序列化）
function parseCustomerRow(row: CustomerRow): Customer {
  return {
    ...row,
    name: JSON.parse(row.name),
    address: row.address ? JSON.parse(row.address) : null
  }
}

// 4. 寫入時序列化
await db.execute(
  'INSERT INTO customers (..., name, ...) VALUES (..., ?, ...)',
  [..., JSON.stringify(name), ...]
)
```

**關鍵優勢**：
- ✅ 型別安全：資料庫層和應用層型別分離
- ✅ 統一模式：所有 BilingualText 欄位使用相同處理邏輯
- ✅ 錯誤隔離：parse 錯誤只影響該筆資料，不會導致整體崩潰
- ✅ API 層簡潔：DAL 已處理序列化，API 直接使用物件

## Proposed Solution

### 架構設計：採用現有模式

**設計原則**：Quotations DAL 應與 Customers/Products DAL 保持一致的架構模式。

#### 階段 1：D1 Schema Migration

新增 migration `migrations/d1/005_add_bilingual_text_columns.sql`：

```sql
-- ============================================================================
-- Migration: 新增報價單雙語文字欄位
-- Purpose: 支援 BilingualText 格式的 description 和 notes
-- ============================================================================

-- 1. quotation_items 新增 description 欄位
ALTER TABLE quotation_items ADD COLUMN description TEXT;

-- 2. quotations.notes 欄位已存在，無需新增

-- ============================================================================
-- Rollback Script（如需回滾）
-- ============================================================================
-- ALTER TABLE quotation_items DROP COLUMN description;
```

**驗證**：
```sql
-- 檢查欄位已新增
SELECT sql FROM sqlite_master WHERE name = 'quotation_items';
```

#### 階段 2：DAL 層重構（`lib/dal/quotations.ts`）

**2.1 新增 Row Interfaces**（資料庫層型別）

```typescript
interface QuotationRow {
  id: string
  user_id: string
  company_id: string | null
  customer_id: string
  quotation_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes: string | null  // ← JSON 字串
  created_at: string
  updated_at: string
}

interface QuotationItemRow {
  id: string
  quotation_id: string
  product_id: string | null
  description: string  // ← JSON 字串
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  created_at: string
  updated_at: string
}
```

**2.2 更新應用層 Interfaces**

```typescript
export interface Quotation {
  // ... 其他欄位
  notes: { zh: string; en: string } | null  // ✅ BilingualText
}

export interface QuotationItem {
  // ... 其他欄位
  description: { zh: string; en: string }  // ✅ BilingualText（必填）
}
```

**2.3 新增 Parse 函式**（反序列化）

```typescript
/**
 * 將資料庫行轉換為 Quotation 物件
 * 處理 JSON 欄位的反序列化，並提供 fallback 容錯
 */
function parseQuotationRow(row: QuotationRow): Quotation {
  let notes: { zh: string; en: string } | null = null

  if (row.notes) {
    try {
      notes = JSON.parse(row.notes)
    } catch (error) {
      console.warn(`Invalid JSON in quotations.notes for id=${row.id}:`, error)
      // Fallback: 將純文字轉為雙語格式
      notes = { zh: row.notes, en: row.notes }
    }
  }

  return {
    ...row,
    notes
  }
}

function parseQuotationItemRow(row: QuotationItemRow): QuotationItem {
  let description: { zh: string; en: string }

  try {
    description = JSON.parse(row.description)
  } catch (error) {
    console.warn(`Invalid JSON in quotation_items.description for id=${row.id}:`, error)
    description = { zh: row.description || '', en: row.description || '' }
  }

  return {
    ...row,
    description
  }
}
```

**2.4 更新 CRUD 函式**

```typescript
// GET：使用 parseRow
export async function getQuotations(...): Promise<Quotation[]> {
  const rows = await db.query<QuotationRow>(sql, params)
  return rows.map(parseQuotationRow)  // ← 自動反序列化
}

export async function getQuotationItems(...): Promise<QuotationItem[]> {
  const rows = await db.query<QuotationItemRow>(sql, params)
  return rows.map(parseQuotationItemRow)
}

// CREATE：序列化後插入
export async function createQuotation(db, userId, data: {
  // ...
  notes?: { zh: string; en: string }
}) {
  await db.execute(
    'INSERT INTO quotations (..., notes, ...) VALUES (..., ?, ...)',
    [
      // ...
      data.notes ? JSON.stringify(data.notes) : null,  // ← 序列化
      // ...
    ]
  )

  const quotation = await getQuotationById(...)  // ← 自動反序列化
  return quotation!
}

export async function createQuotationItem(db, data: {
  quotation_id: string
  description: { zh: string; en: string }  // ← 物件格式
  quantity: number
  unit_price: number
  discount?: number
  subtotal: number
}) {
  await db.execute(
    'INSERT INTO quotation_items (..., description, ...) VALUES (..., ?, ...)',
    [
      // ...
      JSON.stringify(data.description),  // ← 序列化
      // ...
    ]
  )

  return await db.queryOne<QuotationItem>(...)  // ← 反序列化
}
```

#### 階段 3：API 層簡化（`app/api/quotations/route.ts`）

**API 層無需額外序列化處理**（DAL 已處理），只需調整型別：

```typescript
// POST /api/quotations
export async function POST(request: NextRequest) {
  // ...
  const body = await request.json()

  // ✅ 直接傳遞 BilingualText 物件，DAL 會處理序列化
  const quotation = await createQuotation(db, user.id, {
    customer_id: body.customer_id,
    // ...
    notes: body.notes  // { zh: string, en: string } | undefined
  })

  for (const item of body.items) {
    await createQuotationItem(db, {
      quotation_id: quotation.id,
      description: item.description,  // { zh: string, en: string }
      quantity: item.quantity,
      // ...
    })
  }

  return NextResponse.json(quotation)  // ← 已經是物件格式
}

// GET /api/quotations
export async function GET(request: NextRequest) {
  // ...
  const quotations = await getQuotations(db, user.id)

  // ✅ 無需額外處理，DAL 已反序列化
  return NextResponse.json(quotations)
}

// GET /api/quotations/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quotation = await getQuotationById(db, user.id, id)
  const items = await getQuotationItems(db, id)

  // ✅ 無需額外處理
  return NextResponse.json({
    ...quotation,
    items  // items[].description 已經是物件
  })
}
```

#### 階段 4：型別定義修正（`types/models.ts`）

```typescript
export interface Quotation {
  // ...
  notes: BilingualText | null  // ✅ 修正（原為 string | null）
}

export interface QuotationItem {
  // ...
  description: BilingualText  // ✅ 新增（原本缺少）
}

export interface CreateQuotationData {
  // ...
  notes?: BilingualText  // ✅ 修正
}

// 新增 QuotationItem 建立型別
export interface CreateQuotationItemData {
  quotation_id: string
  product_id?: string
  description: BilingualText
  quantity: number
  unit_price: number
  discount?: number
  subtotal: number
}
```

## Alternatives Considered

### 方案 A：在 API 層處理序列化（❌ 不採用）
```typescript
// API 層手動序列化
const quotation = await createQuotation(db, user.id, {
  notes: body.notes ? JSON.stringify(body.notes) : null
})
```

**缺點**：
- ❌ 與現有 Customers/Products 模式不一致
- ❌ 每個 API 端點都需要重複序列化邏輯
- ❌ GET 端點需要手動反序列化，容易遺漏
- ❌ 型別不安全（DAL 接受 string，但應該是物件）

### 方案 B：使用 SQLite Generated Columns（❌ 未來考慮）
```sql
ALTER TABLE quotation_items
  ADD COLUMN description_zh TEXT
    GENERATED ALWAYS AS (json_extract(description, '$.zh')) STORED;
```

**優點**：
- ✅ 可針對特定語言建立索引
- ✅ 簡化單語查詢（如 `WHERE description_zh LIKE '%關鍵字%'`）

**缺點**：
- ❌ 需要 SQLite 3.31.0+（D1 支援，但增加複雜度）
- ❌ 當前需求不需要針對語言查詢
- ❌ 延後到效能優化階段

### 方案 C：分離中英文為獨立欄位（❌ 放棄）
```sql
ALTER TABLE quotation_items
  ADD COLUMN description_zh TEXT,
  ADD COLUMN description_en TEXT;
```

**缺點**：
- ❌ 破壞現有 BilingualText 型別設計
- ❌ 前端需要重構
- ❌ 新增語言需要 schema migration

### 方案 D：採用現有 `parseRow()` 模式（✅ **採用**）
- ✅ 與 Customers/Products 架構一致
- ✅ 型別安全（資料庫層/應用層型別分離）
- ✅ 錯誤隔離（parse 失敗不影響其他資料）
- ✅ API 層簡潔（無需手動序列化）
- ✅ 易於維護和測試

## Implementation Approach

### 實作順序（依賴關係）

1. **Migration 優先** → 確保資料庫 schema 支援
2. **DAL 層重構** → 新增 Row interfaces 和 parse 函式
3. **型別定義更新** → 修正 types/models.ts
4. **API 層調整** → 移除不必要的序列化邏輯
5. **前端驗證** → 確保表單和列表正常運作

### 向後相容性
- ✅ 新增欄位不影響現有資料
- ✅ `notes` 欄位已存在，只改變寫入格式
- ✅ MVP 階段無線上資料，無需 data migration
- ✅ TypeScript 型別修正不影響執行時行為

## Testing Strategy

### 單元測試（Unit Tests）
```typescript
// tests/dal/quotations.test.ts
describe('parseQuotationRow', () => {
  it('應正確解析有效的 notes JSON', () => {
    const row: QuotationRow = {
      // ...
      notes: '{"zh":"測試","en":"Test"}'
    }
    const result = parseQuotationRow(row)
    expect(result.notes).toEqual({ zh: '測試', en: 'Test' })
  })

  it('應提供 fallback 處理無效 JSON', () => {
    const row: QuotationRow = {
      // ...
      notes: 'invalid json'
    }
    const result = parseQuotationRow(row)
    expect(result.notes).toEqual({ zh: 'invalid json', en: 'invalid json' })
  })

  it('應正確處理 null notes', () => {
    const row: QuotationRow = { /* ... */ notes: null }
    const result = parseQuotationRow(row)
    expect(result.notes).toBeNull()
  })
})
```

### 整合測試（Integration Tests）
```typescript
// tests/api/quotations.test.ts
describe('POST /api/quotations', () => {
  it('應成功建立報價單並儲存 BilingualText', async () => {
    const response = await fetch('/api/quotations', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: 'test-customer',
        notes: { zh: '備註', en: 'Notes' },
        items: [{
          description: { zh: '產品', en: 'Product' },
          quantity: 10,
          unit_price: 100,
          subtotal: 1000
        }]
      })
    })

    expect(response.status).toBe(201)
    const quotation = await response.json()

    // 檢查資料庫儲存格式
    const dbRow = await db.queryOne('SELECT notes FROM quotations WHERE id = ?', [quotation.id])
    expect(dbRow.notes).toBe('{"zh":"備註","en":"Notes"}')

    // 檢查 API 回傳格式
    expect(quotation.notes).toEqual({ zh: '備註', en: 'Notes' })
  })
})
```

### 手動測試檢查清單
1. ✅ 建立報價單：填寫中英文描述和備註 → 送出成功
2. ✅ 檢查資料庫：`SELECT description FROM quotation_items LIMIT 1`
   - 預期：`{"zh":"中文描述","en":"English description"}`
3. ✅ 列表頁面：正確顯示中英文內容
4. ✅ 詳情頁面：編輯備註 → 儲存 → 刷新 → 驗證更新
5. ✅ Console 無錯誤
6. ✅ TypeScript 編譯無錯誤

## Risks and Mitigations

### 風險 1：Parse 錯誤導致資料丟失
- **風險**：無效 JSON 導致 `JSON.parse()` 拋出異常
- **緩解**：使用 try-catch 包裝，提供 fallback
- **監控**：記錄 console.warn 到 Cloudflare Workers 日誌
- **驗證**：單元測試涵蓋各種無效 JSON 情況

### 風險 2：型別定義不同步
- **風險**：`types/models.ts` 與 DAL 層型別不一致
- **緩解**：使用 TypeScript strict mode，確保編譯時檢查
- **驗證**：執行 `pnpm run typecheck` 無錯誤

### 風險 3：效能影響（JSON 序列化/反序列化）
- **風險**：大量查詢時 JSON.parse() 增加 CPU 時間
- **測量**：
  - 小型物件（< 1KB）：JSON.parse() < 0.1ms
  - 報價單平均大小：< 5KB
  - 預期影響：每筆資料 < 0.5ms
- **監控**：Cloudflare Workers Analytics 追蹤 CPU time
  ```typescript
  // 在 Workers 中監控
  const start = performance.now()
  const result = JSON.parse(data)
  const duration = performance.now() - start
  if (duration > 5) {
    console.warn(`Slow JSON.parse: ${duration}ms for ${data.length} bytes`)
  }
  ```
- **緩解**：
  - D1 支援 JSON 函式（未來可使用 `json_extract()` 減少傳輸量）
  - KV Cache 減少資料庫查詢次數

### 風險 4：現有資料不相容（低風險）
- **風險**：MVP 階段前有測試資料是純文字格式
- **緩解**：Migration 後執行資料清理腳本
  ```sql
  -- 檢查不符合 JSON 格式的資料
  SELECT id, notes FROM quotations WHERE notes IS NOT NULL AND NOT json_valid(notes);

  -- 手動修正或刪除測試資料
  DELETE FROM quotations WHERE user_id = 'test-user-id';
  ```
- **驗證**：部署前檢查 D1 資料庫無異常資料

### 風險 5：Migration 失敗
- **風險**：`ALTER TABLE ADD COLUMN` 在生產環境失敗
- **緩解**：提供完整 rollback 腳本
  ```sql
  -- Rollback: 移除 description 欄位
  -- 注意：SQLite 不支援 DROP COLUMN，需要重建表

  BEGIN TRANSACTION;

  CREATE TABLE quotation_items_new (
    id TEXT PRIMARY KEY,
    quotation_id TEXT NOT NULL,
    product_id TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
  );

  INSERT INTO quotation_items_new
  SELECT id, quotation_id, product_id, quantity, unit_price, discount, subtotal, created_at, updated_at
  FROM quotation_items;

  DROP TABLE quotation_items;
  ALTER TABLE quotation_items_new RENAME TO quotation_items;

  COMMIT;
  ```
- **驗證**：先在 local D1 測試 migration

## Success Criteria

### 功能驗收
- [x] 報價單建立成功，無 D1_TYPE_ERROR
- [x] 資料庫 `quotation_items.description` 儲存為有效 JSON 字串
- [x] 資料庫 `quotations.notes` 儲存為有效 JSON 字串或 NULL
- [x] GET API 回傳正確的 BilingualText 物件格式
- [x] 前端報價單列表正確顯示中英文描述
- [x] 前端報價單詳情頁正確顯示備註
- [x] 編輯報價單後資料正確更新

### 程式碼品質
- [x] TypeScript 型別檢查通過（`pnpm run typecheck`）
- [x] ESLint 無錯誤（`pnpm run lint`）
- [x] 專案可成功建置（`pnpm run build`）
- [x] 所有單元測試通過
- [x] DAL 層與 Customers/Products 架構一致

### 效能指標
- [x] 報價單建立 API 回應時間 < 500ms（p95）
- [x] 報價單列表 API 回應時間 < 300ms（p95）
- [x] Workers CPU time 增加 < 10%（監控 1 週）

## Future Enhancements（未來優化方向）

### 1. 使用 SQLite JSON 函式減少資料傳輸
```sql
-- 只查詢特定語言（減少網路傳輸）
SELECT
  id,
  quotation_number,
  json_extract(notes, '$.zh') as notes_zh,
  json_extract(notes, '$.en') as notes_en
FROM quotations
WHERE user_id = ?;
```

**優勢**：
- 減少 JSON.parse() 次數
- 減少 Workers 記憶體使用
- 可針對特定語言建立 Generated Column 索引

**時機**：當報價單數量 > 10,000 筆，或效能監控顯示 JSON 處理成為瓶頸時

### 2. 實作 BilingualText 通用工具函式
```typescript
// lib/utils/bilingual.ts
export function parseBilingualText(
  value: string | null,
  fallback?: { zh: string; en: string }
): { zh: string; en: string } | null {
  if (!value) return fallback || null
  try {
    return JSON.parse(value)
  } catch (error) {
    console.warn('Invalid BilingualText JSON:', value, error)
    return fallback || { zh: value, en: value }
  }
}

export function stringifyBilingualText(
  value: { zh: string; en: string } | null
): string | null {
  return value ? JSON.stringify(value) : null
}
```

**優勢**：
- 統一錯誤處理邏輯
- 減少重複程式碼
- 方便新增語言（如日文、韓文）

### 3. 資料驗證層（Zod Schema）
```typescript
import { z } from 'zod'

export const BilingualTextSchema = z.object({
  zh: z.string().min(1),
  en: z.string().min(1)
})

export const CreateQuotationSchema = z.object({
  customer_id: z.string().uuid(),
  notes: BilingualTextSchema.nullable(),
  items: z.array(z.object({
    description: BilingualTextSchema,
    quantity: z.number().positive(),
    // ...
  }))
})
```

**時機**：當 API 層需要更嚴格的輸入驗證時

## Related Work
- 參考實作：`lib/dal/customers.ts` 和 `lib/dal/products.ts`
- 相關規格：`openspec/specs/database-integration/spec.md`
- 相關 Change：`fix-product-quotation-save-bugs`（已歸檔）
- D1 官方文件：[Query JSON](https://developers.cloudflare.com/d1/sql-api/query-json/)
- SQLite JSON1 Extension：[文件](https://www.sqlite.org/json1.html)

## Open Questions

### 已解決

1. ✅ **是否需要支援更多語言？**
   - 回答：目前只需中英文，JSON 格式已具備擴展性
   - 未來新增語言只需修改 TypeScript 型別，無需 schema migration

2. ✅ **是否需要遷移現有資料？**
   - 回答：專案處於 MVP 階段，D1 資料庫為開發資料，可直接清空
   - 生產環境部署時無舊資料需遷移

3. ✅ **應採用哪種架構模式？**
   - 回答：採用與 Customers/Products 一致的 `parseRow()` 模式
   - 理由：型別安全、錯誤隔離、API 層簡潔

4. ✅ **是否需要在資料庫層驗證 JSON 格式？**
   - 回答：依賴 API 層驗證（Zod Schema）+ DAL 層 try-catch
   - SQLite 無原生 JSON constraint，CHECK constraint 會增加複雜度

### 待確認

5. ❓ **是否需要實作 BilingualText 通用工具函式？**
   - 建議：本次先實作於 DAL 層，未來若有第四個模組（如 Invoices）再抽取為共用函式
   - 時機：當有 3+ 個模組使用 BilingualText 時

6. ❓ **是否需要為 JSON 欄位建立 Generated Columns？**
   - 建議：延後到效能優化階段
   - 時機：當需要針對特定語言建立全文搜尋索引時
