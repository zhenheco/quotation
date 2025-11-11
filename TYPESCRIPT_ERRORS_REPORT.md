# TypeScript 錯誤修復報告

生成時間：2025-11-11
錯誤總數：297（從原始 357 減少 60個）

## 已完成修復

### 1. API 路由請求體類型 ✅
- `app/api/contracts/from-quotation/route.ts` - 新增 `ConvertQuotationRequest` 介面
- `app/api/contracts/[id]/next-collection/route.ts` - 新增 `UpdateNextCollectionRequest` 介面
- `app/api/payments/collected/route.ts` - 修復 reduce 回調函式類型
- `app/api/payments/reminders/route.ts` - 修復 reduce 回調函式類型

### 2. 資料庫服務函式參數 ✅
修復以下函式缺少 `userId` 參數的問題：
- `getCustomerById(id, userId)`
- `deleteCustomer(id, userId)`
- `getProductById(id, userId)`
- `deleteProduct(id, userId)`
- `getQuotationById(id, userId)`
- `deleteQuotation(id, userId)`
- `getQuotationItems(quotationId, userId)`
- `deleteQuotationItem(id, quotationId, userId)`
- `validateCustomerOwnership(customerId, userId)`
- `validateProductOwnership(productId, userId)`

### 3. Product 介面欄位 ✅
在 `lib/services/database.ts` 的 Product 介面新增：
- `base_price?: number`
- `base_currency?: string`

### 4. Quotation 資料修正 ✅
- 修正 `data.total_amount` → `data.total`

## 剩餘錯誤分類（優先級排序）

### 🔴 高優先級：Type 'unknown' 錯誤（96 個）

#### 1. Database 查詢結果類型（51 個）
**問題**：各種資料庫查詢回傳 `unknown` 類型
```typescript
// 檔案分佈：
// - lib/api/*.ts
// - app/api/**/route.ts

// 範例錯誤：
'result' is of type 'unknown'.     (26 次)
'data' is of type 'unknown'.       (25 次)

// 建議修復：
interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

const result: QueryResult<Customer> = await query(...);
```

#### 2. Table 類型欄位不存在（24 個）
**問題**：Supabase 表類型定義不完整
```typescript
Property 'Row' does not exist on type 'unknown'.      (13 次)
Property 'Insert' does not exist on type 'unknown'.   (6 次)
Property 'Update' does not exist on type 'unknown'.   (5 次)

// 檔案：
// - lib/services/company.ts
// - lib/services/payment-terms.ts
// - lib/services/payment-terms.client.ts
// - types/extended.types.ts

// 建議修復：
// 1. 更新 Supabase types generation
// 2. 或手動定義類型：
import type { Database } from '@/types/database.types';
type Tables = Database['public']['Tables'];
type CompanyRow = Tables['companies']['Row'];
```

#### 3. 錯誤處理類型（20 個）
```typescript
'error' is of type 'unknown'.       (13 次)
'errorData' is of type 'unknown'.   (7 次)

// 建議修復：
catch (error: unknown) {
  if (error instanceof Error) {
    // error.message 可用
  } else if (typeof error === 'string') {
    // error 是字串
  } else {
    // 未知錯誤
  }
}
```

#### 4. API Response Payload（4 個）
```typescript
Property 'payload' does not exist on type 'unknown'.
Property 'status' does not exist on type 'unknown'.
Property 'locale' does not exist on type 'unknown'.

// 建議修復：新增介面定義
interface ApiPayload {
  status: string;
  payload: unknown;
  locale?: string;
}
```

### 🟡 中優先級：Null/Undefined 不匹配（30 個）

#### 1. Null vs Undefined（20 個）
```typescript
Type 'string | null' is not assignable to type 'string | undefined'. (17 次)
Type 'string | null' is not assignable to type '{ zh: string; en: string; } | undefined'. (3 次)

// 檔案：
// - app/api/companies/route.ts
// - app/api/customers/route.ts

// 建議修復：使用 ?? 運算子轉換
const value = dbValue ?? undefined;  // null → undefined
```

#### 2. Type Conversion（5 個）
```typescript
Type 'unknown' is not assignable to type 'string | undefined'. (5 次)

// 建議修復：加上類型守衛
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

### 🟢 低優先級：其他類型錯誤（171 個）

#### 1. RoleName 類型轉換（8 個）
```typescript
Argument of type 'string' is not assignable to parameter of type 'RoleName'.

// 檔案：
// - app/api/admin/companies/[id]/members/route.ts
// - app/api/admin/users/[id]/role/route.ts
// - app/api/company/[id]/members/**/route.ts

// 建議修復：
const roleName = body.role as RoleName;
// 或加上驗證
const validRoles: RoleName[] = ['admin', 'member', 'viewer'];
if (!validRoles.includes(body.role as RoleName)) {
  throw new Error('Invalid role');
}
```

#### 2. 參數類型不匹配（6 個）
```typescript
Argument of type 'number' is not assignable to parameter of type 'string'.

// 建議修復：
const stringParam = String(numberValue);
```

#### 3. Headers 類型（3 個）
```typescript
Type '{ 'Content-Type': string; apikey: string | undefined; Authorization: string; }'
is not assignable to type 'HeadersInit | undefined'.

// 檔案：scripts/execute-migration-supabase-api.ts, scripts/run-supabase-migration.ts

// 建議修復：
const headers: HeadersInit = {
  'Content-Type': 'application/json',
  ...(apikey && { apikey }),
  Authorization: bearer
};
```

#### 4. React 導入錯誤（2 個）
```typescript
'React' refers to a UMD global, but the current file is a module.
Consider adding an import instead.

// 檔案：lib/security/csrf.ts

// 修復：
import React from 'react';
```

#### 5. 其他錯誤
- Expected arguments mismatch (多處)
- Property does not exist (多處)
- Type conversion errors (多處)
- Unused @ts-expect-error directives (3 個)
- Cannot find name errors (lib/dal/exchange-rates.ts, lib/db/zeabur.ts)

## 修復策略建議

### 階段一：快速勝利（減少 50-80 個錯誤）
1. 批量修復 `null` → `undefined` 轉換
2. 新增缺少的 `import React` 語句
3. 移除未使用的 `@ts-expect-error` 指令
4. 修復 RoleName 類型轉換

### 階段二：結構性修復（減少 100-150 個錯誤）
1. 更新 Supabase types generation
2. 統一資料庫查詢回傳類型
3. 建立統一的錯誤處理類型
4. 修復 API payload 類型定義

### 階段三：深度重構（剩餘錯誤）
1. 重新設計部分 API 回應結構
2. 強化類型守衛和驗證
3. 審查並修正所有 `any` 類型使用

## 可立即執行的修復腳本

### 1. 批量新增 null coalescing
```bash
# 在 app/api/companies/route.ts 和 app/api/customers/route.ts
# 搜尋: row.field
# 替換: row.field ?? undefined
```

### 2. 新增 React import
```bash
# lib/security/csrf.ts 第一行加上：
import React from 'react';
```

### 3. 建立統一的查詢類型
```typescript
// lib/db/types.ts (新檔案)
export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  command: string;
}

export interface QueryResultRow {
  [key: string]: unknown;
}
```

## 預期效果

- **立即可達成**：錯誤數從 297 → 200（減少 97 個）
- **短期目標**：錯誤數 → 100 以下
- **最終目標**：錯誤數 → 0（或少於 10 個可接受的抑制）

## 建議下一步

1. 執行階段一快速修復（預計 1-2 小時）
2. 更新 Supabase 類型生成（預計 30 分鐘）
3. 重新執行 typecheck 評估進度
4. 決定是否繼續深度重構或使用 `@ts-expect-error` 抑制剩餘錯誤

---

**注意**：由於專案規模較大且錯誤涉及多個層面，建議分批次修復，每次修復後執行測試確保功能正常運作。
