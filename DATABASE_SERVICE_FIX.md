# 資料庫服務層產品欄位映射修復

## 問題描述

報價單編輯頁面從下拉選單選擇產品後，單價（unit_price）和幣別（currency）無法正確顯示，所有欄位都顯示為 0。

## 根本原因

問題出在 `lib/services/database.ts` 的產品相關函數：

1. **資料庫欄位名稱**：`base_price` 和 `base_currency`
2. **TypeScript 介面定義**：`unit_price` 和 `currency`
3. **欄位不匹配**：函數直接返回資料庫原始數據，導致前端無法讀取

### 錯誤流程

```typescript
// 資料庫查詢
SELECT * FROM products WHERE user_id = $1

// 返回資料（未映射）
{
  id: '123',
  base_price: 100,
  base_currency: 'TWD',
  // 缺少 unit_price 和 currency
}

// 前端嘗試讀取
product.unit_price  // undefined → 0
product.currency    // undefined → ''
```

## 解決方案

在資料庫服務層的所有產品函數中加入欄位映射，確保返回的資料包含前端期望的欄位名稱。

### 修改的函數

#### 1. `getProducts()` - 取得所有產品

**位置**：`lib/services/database.ts:192-202`

```typescript
export async function getProducts(userId: string): Promise<Product[]> {
  const result = await query(
    'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  // ✅ 加入映射
  return result.rows.map(row => ({
    ...row,
    unit_price: row.base_price,
    currency: row.base_currency
  }))
}
```

#### 2. `getProductById()` - 取得單一產品

**位置**：`lib/services/database.ts:204-216`

```typescript
export async function getProductById(id: string, userId: string): Promise<Product | null> {
  const result = await query(
    'SELECT * FROM products WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  const row = result.rows[0]
  if (!row) return null
  // ✅ 加入映射
  return {
    ...row,
    unit_price: row.base_price,
    currency: row.base_currency
  }
}
```

#### 3. `createProduct()` - 建立產品

**位置**：`lib/services/database.ts:218-247`

```typescript
export async function createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
  const result = await query(
    `INSERT INTO products (
      user_id, sku, name, description, base_price, base_currency, category,
      cost_price, cost_currency, profit_margin, supplier, supplier_code
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.user_id,
      data.sku,
      data.name,
      data.description,
      data.unit_price,        // ✅ 使用前端提供的 unit_price
      data.currency,          // ✅ 使用前端提供的 currency
      data.category,
      data.cost_price,
      data.cost_currency,
      data.profit_margin,
      data.supplier,
      data.supplier_code
    ]
  )
  const row = result.rows[0]
  // ✅ 返回時映射欄位
  return {
    ...row,
    unit_price: row.base_price,
    currency: row.base_currency
  }
}
```

#### 4. `updateProduct()` - 更新產品

**位置**：`lib/services/database.ts:258-293`

```typescript
export async function updateProduct(
  id: string,
  userId: string,
  data: Partial<Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Product | null> {
  try {
    const { fields, values, paramCount } = buildUpdateFields(
      data,
      PRODUCT_ALLOWED_FIELDS
    )

    if (fields.length === 0) {
      return getProductById(id, userId)
    }

    values.push(id, userId)

    const result = await query(
      `UPDATE products
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    )

    const row = result.rows[0]
    if (!row) return null
    // ✅ 返回時映射欄位
    return {
      ...row,
      unit_price: row.base_price,
      currency: row.base_currency
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Update product failed:', { id, error: errorMessage })
    throw error
  }
}
```

## 修復後的流程

```typescript
// 資料庫查詢
SELECT * FROM products WHERE user_id = $1

// 返回資料（已映射）
{
  id: '123',
  base_price: 100,       // 原始欄位（向後相容）
  base_currency: 'TWD',  // 原始欄位（向後相容）
  unit_price: 100,       // ✅ 映射欄位
  currency: 'TWD'        // ✅ 映射欄位
}

// 前端正確讀取
product.unit_price  // 100 ✅
product.currency    // 'TWD' ✅
```

## 驗證結果

### 建置測試
```bash
npm run build
✓ Compiled successfully
⚠ Compiled with warnings in 11.4s
```

### 向後相容性
- ✅ 保留原始欄位 `base_price` 和 `base_currency`
- ✅ 新增映射欄位 `unit_price` 和 `currency`
- ✅ 不影響現有 API 端點

## 修改檔案清單

1. ✅ `lib/services/database.ts` - 產品資料庫服務層
   - `getProducts()` - 第 192-202 行
   - `getProductById()` - 第 204-216 行
   - `createProduct()` - 第 218-247 行
   - `updateProduct()` - 第 258-293 行

## 相關文件

- `PRODUCT_FIELD_MAPPING_FIX.md` - API 層修復記錄
- `openspec/changes/fix-product-field-mapping/` - OpenSpec 變更提案
- `lib/services/database.ts` - 資料庫服務層

## 注意事項

1. **一致性**：所有產品相關函數都必須返回映射後的欄位
2. **向後相容**：同時保留原始欄位和映射欄位
3. **類型安全**：TypeScript 介面定義與實際返回資料保持一致

## 未來建議

1. 考慮在資料庫層面統一欄位命名（需要遷移）
2. 建立 TypeScript 類型守衛確保資料正確性
3. 加入單元測試驗證欄位映射邏輯

---

**修復日期**：2025-11-03
**修復者**：Claude Code
