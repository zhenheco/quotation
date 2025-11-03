# 產品欄位映射修復報告

## 問題描述

報價單編輯表單中，選擇產品後無法自動填入單價、折扣和小計資料。

### 症狀
- 用戶選擇產品後
- 數量顯示為 1（正確）
- 單價、折扣、小計都顯示為 0（錯誤）

## 根本原因分析

### 資料庫 Schema
資料庫 `products` 表使用以下欄位名稱：
```sql
base_price DECIMAL(12, 2) NOT NULL
base_currency VARCHAR(3) NOT NULL DEFAULT 'TWD'
```

### 前端期望
前端介面（`hooks/useProducts.ts`）期望以下欄位名稱：
```typescript
interface CreateProductInput {
  unit_price: number
  currency: string
}
```

### API 行為
產品 API (`/api/products`) 使用 `select('*')` 直接返回資料庫欄位，導致：
- API 返回：`{ base_price: 100, base_currency: 'TWD' }`
- 前端期望：`{ unit_price: 100, currency: 'TWD' }`
- 結果：前端無法讀取 `product.unit_price`，顯示為 `undefined` → `0`

## 解決方案

### 選擇方案：API 層欄位映射

**為什麼選擇這個方案？**
1. 不需要修改資料庫 Schema（避免破壞性變更）
2. 集中處理在 API 層，易於維護
3. 保持前端代碼的簡潔性
4. 與現有文件（MIGRATION_INSTRUCTIONS.md）保持一致

### 實作細節

#### 1. GET /api/products - 取得所有產品
**檔案**：`app/api/products/route.ts:21-35`

```typescript
const { data: products, error } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

if (error) throw error

// 新增：映射欄位名稱
const mappedProducts = products?.map(product => ({
  ...product,
  unit_price: product.base_price,
  currency: product.base_currency
}))

return NextResponse.json(mappedProducts)
```

#### 2. GET /api/products/[id] - 取得單一產品
**檔案**：`app/api/products/[id]/route.ts:32-45`

```typescript
if (error || !product) {
  return NextResponse.json(
    { error: 'Product not found' },
    { status: 404 }
  )
}

// 新增：映射欄位名稱
const mappedProduct = {
  ...product,
  unit_price: product.base_price,
  currency: product.base_currency
}

return NextResponse.json(mappedProduct)
```

#### 3. PUT /api/products/[id] - 更新產品
**檔案**：`app/api/products/[id]/route.ts:102-115`

```typescript
if (error || !product) {
  return NextResponse.json(
    { error: 'Product not found or unauthorized' },
    { status: 404 }
  )
}

// 新增：映射欄位名稱
const mappedProduct = {
  ...product,
  unit_price: product.base_price,
  currency: product.base_currency
}

return NextResponse.json(mappedProduct)
```

## 修改檔案清單

1. ✅ `app/api/products/route.ts` - GET 端點加入欄位映射
2. ✅ `app/api/products/[id]/route.ts` - GET 和 PUT 端點加入欄位映射

## 驗證結果

### Build 測試
```bash
npm run build
✓ Compiled successfully
```

### 預期行為修復

**修復前**：
```typescript
// API 返回
{ id: '123', base_price: 100, base_currency: 'TWD' }

// 前端嘗試讀取
product.unit_price  // undefined
product.currency    // undefined

// 結果
單價顯示為 0
```

**修復後**：
```typescript
// API 返回（已映射）
{
  id: '123',
  base_price: 100,
  base_currency: 'TWD',
  unit_price: 100,    // 新增映射
  currency: 'TWD'     // 新增映射
}

// 前端讀取
product.unit_price  // 100 ✅
product.currency    // 'TWD' ✅

// 結果
單價正確顯示為 100
```

## 相關文件

- `MIGRATION_INSTRUCTIONS.md` - 資料庫欄位遷移說明
- `hooks/useProducts.ts` - 產品 Hook 定義
- `app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx` - 報價單編輯表單

## 注意事項

1. **向後相容**：API 同時返回 `base_price` 和 `unit_price`，確保向後相容
2. **資料完整性**：保留所有資料庫欄位，僅新增映射欄位
3. **一致性**：所有產品 API 端點都應用相同的映射邏輯

## 未來建議

1. 考慮統一資料庫和前端的欄位命名（可能需要大規模重構）
2. 建立 TypeScript 類型守衛確保 API 響應格式正確
3. 加入 API 層的自動化測試驗證欄位映射

---

**修復日期**：2025-11-03
**修復者**：Claude Code (Backend System Architect)
