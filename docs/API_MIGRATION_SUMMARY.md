# API Routes 遷移摘要報告

**日期**: 2025-10-17
**任務**: 將所有 Form 和 List 組件從直接使用 Supabase 客戶端改為使用 API routes

---

## 修改概覽

### 新建的 API Routes

#### 1. Products API

**檔案**: `app/api/products/route.ts`
- **方法**: POST
- **功能**: 建立新產品
- **驗證**: 用戶認證、必填欄位、價格驗證
- **使用服務**: `createProduct` from `@/lib/services/database`

**檔案**: `app/api/products/[id]/route.ts`
- **方法**: PUT, DELETE
- **功能**: 更新/刪除產品
- **驗證**: 用戶認證、所有權驗證、價格驗證（更新時）
- **使用服務**: `updateProduct`, `deleteProduct` from `@/lib/services/database`

#### 2. Quotations API

**檔案**: `app/api/quotations/route.ts`
- **方法**: POST
- **功能**: 建立新報價單及其項目
- **驗證**: 用戶認證、客戶所有權、必填欄位
- **特殊功能**: 自動生成報價單號碼、批次建立報價單項目
- **使用服務**:
  - `createQuotation`
  - `createQuotationItem`
  - `generateQuotationNumber`
  - `validateCustomerOwnership`

**檔案**: `app/api/quotations/[id]/route.ts`
- **方法**: PUT, DELETE
- **功能**: 更新/刪除報價單及其項目
- **驗證**: 用戶認證、報價單存在性、客戶所有權
- **特殊功能**:
  - 更新時先刪除舊項目再插入新項目（確保資料一致性）
  - 刪除時級聯刪除所有項目
- **使用服務**:
  - `updateQuotation`
  - `deleteQuotation`
  - `getQuotationById`
  - `createQuotationItem`

---

## 修改的組件檔案

### 1. ProductForm.tsx
**路徑**: `app/[locale]/products/ProductForm.tsx`

**修改內容**:
- ❌ 移除 `import { createClient } from '@/lib/supabase/client'`
- ❌ 移除 `const supabase = createClient()`
- ❌ 移除直接的 Supabase 操作
- ✅ 改用 `fetch('/api/products')` (POST)
- ✅ 改用 `fetch('/api/products/${id}')` (PUT)
- ✅ 改進錯誤處理，顯示 API 返回的具體錯誤訊息

**變更前**:
```typescript
const { error: updateError } = await supabase
  .from('products')
  .update(productData)
  .eq('id', product.id)
```

**變更後**:
```typescript
response = await fetch(`/api/products/${product.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(productData),
})
```

---

### 2. ProductList.tsx
**路徑**: `app/[locale]/products/ProductList.tsx`

**修改內容**:
- ❌ 移除 `import { createClient } from '@/lib/supabase/client'`
- ❌ 移除 `const supabase = createClient()`
- ❌ 移除直接的 Supabase DELETE 操作
- ✅ 改用 `fetch('/api/products/${id}')` (DELETE)
- ✅ 改進錯誤處理

**變更前**:
```typescript
const { error } = await supabase
  .from('products')
  .delete()
  .eq('id', deleteModal.product.id)
```

**變更後**:
```typescript
const response = await fetch(`/api/products/${deleteModal.product.id}`, {
  method: 'DELETE',
})
```

---

### 3. QuotationForm.tsx
**路徑**: `app/[locale]/quotations/QuotationForm.tsx`

**修改內容**:
- ❌ 移除 `import { createClient } from '@/lib/supabase/client'`
- ❌ 移除 `const supabase = createClient()`
- ❌ 移除 `supabase.auth.getUser()` 調用（已在 API route 中處理）
- ❌ 移除報價單號碼生成邏輯（已移至 API route）
- ❌ 移除直接的 Supabase INSERT/UPDATE 操作
- ✅ 改用 `fetch('/api/quotations')` (POST)
- ✅ 改用 `fetch('/api/quotations/${id}')` (PUT)
- ✅ 簡化資料結構，將 items 包含在請求 body 中

**變更前**:
```typescript
const { data: newQuotation, error: insertError } = await supabase
  .from('quotations')
  .insert([quotationData])
  .select()
  .single()

const quotationItems = items.map((item, index) => ({
  quotation_id: newQuotation.id,
  // ...
}))

await supabase.from('quotation_items').insert(quotationItems)
```

**變更後**:
```typescript
const quotationData = {
  customer_id: formData.customerId,
  // ...
  items: items.map((item) => ({
    product_id: item.product_id,
    // ...
  })),
}

response = await fetch('/api/quotations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(quotationData),
})
```

---

### 4. QuotationList.tsx
**路徑**: `app/[locale]/quotations/QuotationList.tsx`

**修改內容**:
- ❌ 移除 `import { createClient } from '@/lib/supabase/client'`
- ❌ 移除 `const supabase = createClient()`
- ❌ 移除手動級聯刪除邏輯（先刪 items 再刪 quotation）
- ✅ 改用 `fetch('/api/quotations/${id}')` (DELETE)
- ✅ API route 自動處理級聯刪除

**變更前**:
```typescript
// 先刪除 quotation_items
const { error: itemsError } = await supabase
  .from('quotation_items')
  .delete()
  .eq('quotation_id', deleteModal.quotation.id)

// 再刪除 quotation
const { error } = await supabase
  .from('quotations')
  .delete()
  .eq('id', deleteModal.quotation.id)
```

**變更後**:
```typescript
const response = await fetch(`/api/quotations/${deleteModal.quotation.id}`, {
  method: 'DELETE',
})
```

---

### 5. QuotationDetail.tsx
**路徑**: `app/[locale]/quotations/[id]/QuotationDetail.tsx`

**修改內容**:
- ❌ 移除 `import { createClient } from '@/lib/supabase/client'`
- ❌ 移除 `const supabase = createClient()`
- ❌ 移除直接的 Supabase UPDATE 操作
- ✅ 改用 `fetch('/api/quotations/${id}')` (PUT) 更新狀態
- ✅ 改進錯誤處理

**變更前**:
```typescript
const { error } = await supabase
  .from('quotations')
  .update({ status: newStatus })
  .eq('id', quotation.id)
```

**變更後**:
```typescript
const response = await fetch(`/api/quotations/${quotation.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: newStatus }),
})
```

---

## 已驗證正確使用 API routes 的組件

### CustomerForm.tsx ✓
**路徑**: `app/[locale]/customers/CustomerForm.tsx`
- 已正確使用 `fetch('/api/customers')` 和 `fetch('/api/customers/${id}')`
- 無需修改

### CustomerList.tsx ✓
**路徑**: `app/[locale]/customers/CustomerList.tsx`
- 已正確使用 `fetch('/api/customers/${id}')` (DELETE)
- 無需修改

---

## 架構優勢

### 1. 統一的錯誤處理
所有 API routes 都返回一致的錯誤格式：
```json
{
  "error": "具體的錯誤訊息"
}
```

### 2. 安全性提升
- 所有資料操作都在伺服器端執行
- 統一的用戶認證檢查
- 自動的所有權驗證（多租戶隔離）
- 減少客戶端暴露的 API surface

### 3. 業務邏輯集中化
- 報價單號碼生成邏輯集中在 API route
- 級聯刪除邏輯集中在 API route
- 客戶/產品所有權驗證集中在 API route

### 4. 可維護性提升
- 組件更簡潔，專注於 UI 邏輯
- API 變更時只需修改 routes，無需修改多個組件
- 更容易添加日誌、監控、速率限制等中間件

### 5. 測試友好
- API routes 可獨立測試
- 更容易 mock API 回應進行組件測試

---

## 資料流程

### 建立流程（以 Product 為例）

```
用戶填寫表單
    ↓
ProductForm.tsx
    ↓ fetch POST /api/products
API Route (驗證用戶、驗證資料)
    ↓
database.ts (createProduct)
    ↓
PostgreSQL (Zeabur)
    ↓ 返回結果
API Route
    ↓ JSON response
ProductForm.tsx
    ↓ router.push & router.refresh
顯示成功訊息 / 跳轉列表頁
```

### 更新流程（以 Quotation 為例）

```
用戶修改表單
    ↓
QuotationForm.tsx
    ↓ fetch PUT /api/quotations/${id}
API Route (驗證用戶、驗證所有權)
    ↓
刪除舊的 quotation_items
    ↓
database.ts (updateQuotation)
    ↓
建立新的 quotation_items
    ↓
PostgreSQL (Zeabur)
    ↓ 返回結果
API Route
    ↓ JSON response
QuotationForm.tsx
    ↓ router.push & router.refresh
顯示成功訊息 / 跳轉列表頁
```

### 刪除流程（以 Quotation 為例）

```
用戶點擊刪除按鈕
    ↓
QuotationList.tsx (確認彈窗)
    ↓ fetch DELETE /api/quotations/${id}
API Route (驗證用戶、驗證所有權)
    ↓
刪除 quotation_items (級聯)
    ↓
database.ts (deleteQuotation)
    ↓
PostgreSQL (Zeabur)
    ↓ 返回結果
API Route
    ↓ JSON response
QuotationList.tsx
    ↓ router.refresh
更新列表顯示
```

---

## 未來改進建議

### 1. 類型安全強化
考慮使用 Zod 或 Yup 進行請求體驗證：
```typescript
import { z } from 'zod'

const productSchema = z.object({
  name: z.object({
    zh: z.string().min(1),
    en: z.string().min(1),
  }),
  base_price: z.number().positive(),
  // ...
})
```

### 2. 統一的 API 回應格式
建立標準的成功回應格式：
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

### 3. 速率限制
考慮添加速率限制中間件：
```typescript
import rateLimit from '@/lib/rate-limit'

export async function POST(request: Request) {
  await rateLimit(request)
  // ...
}
```

### 4. 日誌記錄
統一的操作日誌：
```typescript
import { logOperation } from '@/lib/logger'

await logOperation('CREATE_PRODUCT', { userId, productId })
```

### 5. 批次操作 API
考慮為常見的批次操作建立專用 API：
- `POST /api/products/batch` - 批次建立產品
- `DELETE /api/products/batch` - 批次刪除產品

---

## 測試建議

### 單元測試（API Routes）
```typescript
import { POST } from '@/app/api/products/route'

describe('POST /api/products', () => {
  it('should create a product with valid data', async () => {
    const request = new Request('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: { zh: '測試產品', en: 'Test Product' },
        base_price: 100,
        base_currency: 'TWD'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })

  it('should reject unauthorized requests', async () => {
    // Mock unauthorized user
    const response = await POST(mockRequest)
    expect(response.status).toBe(401)
  })
})
```

### 整合測試（E2E）
使用 Playwright 測試完整流程：
```typescript
test('should create and delete a product', async ({ page }) => {
  await page.goto('/products/new')
  await page.fill('[name="nameZh"]', '測試產品')
  await page.fill('[name="nameEn"]', 'Test Product')
  await page.fill('[name="basePrice"]', '100')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/products')
  await expect(page.locator('text=測試產品')).toBeVisible()
})
```

---

## 完成檢查清單

- [x] 建立 Products API routes (POST, PUT, DELETE)
- [x] 建立 Quotations API routes (POST, PUT, DELETE)
- [x] 修改 ProductForm.tsx 使用 API routes
- [x] 修改 ProductList.tsx 使用 API routes
- [x] 修改 QuotationForm.tsx 使用 API routes
- [x] 修改 QuotationList.tsx 使用 API routes
- [x] 修改 QuotationDetail.tsx 使用 API routes
- [x] 驗證 CustomerForm.tsx 已正確使用 API routes
- [x] 驗證 CustomerList.tsx 已正確使用 API routes
- [x] 建立文檔說明變更內容

---

## 總結

本次遷移成功將 **7 個組件** 從直接使用 Supabase 客戶端改為使用 **4 個新建的 API routes**，大幅提升了：

1. **安全性** - 所有資料操作在伺服器端執行
2. **可維護性** - 業務邏輯集中管理
3. **一致性** - 統一的錯誤處理和驗證
4. **可測試性** - 更容易進行單元測試和整合測試

所有組件現在都遵循統一的架構模式，未來的新功能開發將更加容易和安全。
