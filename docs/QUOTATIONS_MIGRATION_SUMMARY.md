# Quotations 頁面遷移摘要

## 修改日期
2025-10-17

## 修改目標
將 quotations 相關頁面從 Supabase 客戶端查詢遷移到 Zeabur PostgreSQL 直連模式。

## 修改文件清單

### 1. `/app/[locale]/quotations/page.tsx` - 報價單列表頁
**修改前**：
- 使用 `supabase.from('quotations').select()` 查詢報價單
- 使用 Supabase 的關聯查詢獲取客戶資訊

**修改後**：
- 使用 `getQuotations(user.id)` 獲取報價單列表
- 使用 `Promise.all` 批量獲取每個報價單的客戶資訊
- 組合數據為 `quotationsWithCustomers` 傳遞給 UI 組件

**關鍵變更**：
```typescript
// Before
const { data: quotations } = await supabase
  .from('quotations')
  .select(`*, customers(id, name, email)`)
  .eq('user_id', user.id)

// After
const quotations = await getQuotations(user.id)
const quotationsWithCustomers = await Promise.all(
  quotations.map(async (quotation) => {
    const customer = await getCustomerById(quotation.customer_id, user.id)
    return { ...quotation, customers: customer ? {...} : null }
  })
)
```

---

### 2. `/app/[locale]/quotations/[id]/page.tsx` - 報價單詳情頁
**修改前**：
- 使用 Supabase 的嵌套查詢一次性獲取報價單、客戶和項目資訊

**修改後**：
- 分步查詢：報價單 → 客戶 → 項目 → 產品
- 使用 `Promise.all` 為每個項目獲取產品詳情
- 組合所有數據為完整的報價單對象

**關鍵變更**：
```typescript
// Before
const { data: quotation } = await supabase
  .from('quotations')
  .select(`*, customers(*), items:quotation_items(*, products(*))`)
  .eq('id', id)
  .single()

// After
const quotation = await getQuotationById(id, user.id)
const customer = await getCustomerById(quotation.customer_id, user.id)
const items = await getQuotationItems(quotation.id, user.id)
const itemsWithProducts = await Promise.all(
  items.map(async (item) => {
    const product = item.product_id ? await getProductById(item.product_id, user.id) : null
    return { ...item, products: product ? {...} : null }
  })
)
```

---

### 3. `/app/[locale]/quotations/new/page.tsx` - 新建報價單頁
**修改前**：
- 使用 `supabase.from('customers').select()` 獲取客戶列表
- 使用 `supabase.from('products').select()` 獲取產品列表

**修改後**：
- 使用 `getCustomers(user.id)` 獲取客戶列表
- 使用 `getProducts(user.id)` 獲取產品列表
- 直接傳遞數據給表單組件

**關鍵變更**：
```typescript
// Before
const { data: customers } = await supabase.from('customers').select('*').eq('user_id', user.id)
const { data: products } = await supabase.from('products').select('*').eq('user_id', user.id)

// After
const customers = await getCustomers(user.id)
const products = await getProducts(user.id)
```

---

## 使用的 Database Service 函數

所有函數來自 `/lib/services/database.ts`：

1. **getQuotations(userId)** - 獲取用戶的所有報價單
2. **getQuotationById(id, userId)** - 獲取單個報價單
3. **getCustomerById(id, userId)** - 獲取客戶詳情
4. **getQuotationItems(quotationId, userId)** - 獲取報價單項目
5. **getProductById(id, userId)** - 獲取產品詳情
6. **getCustomers(userId)** - 獲取所有客戶
7. **getProducts(userId)** - 獲取所有產品

## 保留的功能

### Supabase 認證
所有頁面仍使用 Supabase Auth 進行用戶驗證：
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

### 國際化
- 保留 `next-intl` 的 `getTranslations()`
- 保留 `locale` 參數處理

### UI 組件
- 保留所有現有的 UI 組件引用
- 保留 `PageHeader`、`QuotationList`、`QuotationDetail`、`QuotationForm`

## 數據結構兼容性

### 關聯數據處理
為保持與原有 UI 組件的兼容性，手動構建了與 Supabase 關聯查詢相同的數據結構：

```typescript
// 原 Supabase 關聯查詢返回的結構
{
  ...quotation,
  customers: { id, name, email, ... }
}

// 新的手動組合結構（保持一致）
{
  ...quotation,
  customers: customer ? { id: customer.id, name: customer.name, ... } : null
}
```

## 錯誤處理

### 報價單不存在
```typescript
const quotation = await getQuotationById(id, user.id)
if (!quotation) {
  notFound()  // 觸發 404 頁面
}
```

### 客戶/產品缺失
使用可選鏈和空值處理：
```typescript
customers: customer ? { id: customer.id, ... } : null
products: product ? { id: product.id, ... } : null
```

## 性能考量

### 批量查詢優化
使用 `Promise.all` 並行執行多個查詢，而非順序執行：

```typescript
const itemsWithProducts = await Promise.all(
  items.map(async (item) => {
    // 每個項目的產品查詢並行執行
    const product = item.product_id ? await getProductById(item.product_id, user.id) : null
    return { ...item, products: product ? {...} : null }
  })
)
```

### 查詢次數
- **列表頁**：1 次報價單查詢 + N 次客戶查詢（N = 報價單數量）
- **詳情頁**：1 次報價單 + 1 次客戶 + 1 次項目 + M 次產品查詢（M = 項目數量）
- **新建頁**：1 次客戶列表 + 1 次產品列表

## 多租戶安全

所有查詢都強制檢查 `user_id`，確保數據隔離：
- `getQuotations(userId)` - 只返回該用戶的報價單
- `getQuotationById(id, userId)` - 驗證報價單所有權
- `getQuotationItems(quotationId, userId)` - 先驗證報價單所有權

## 測試驗證

### 導入驗證
```bash
✓ 所有數據庫服務函數導入成功
✓ getQuotations: function
✓ getCustomerById: function
✓ getQuotationById: function
✓ getQuotationItems: function
✓ getProductById: function
```

### 建議測試場景
1. 列表頁顯示所有報價單和客戶名稱
2. 詳情頁顯示完整報價單資訊（包括客戶和產品詳情）
3. 新建頁可選擇客戶和產品
4. 權限測試：確保用戶只能看到自己的數據
5. 空數據處理：沒有報價單/客戶/產品時的顯示

## 後續工作

### API 路由遷移
以下 API 路由可能仍在使用 Supabase 客戶端，需要類似遷移：
- `/app/api/quotations/*` - 報價單相關 API
- 建議檢查並使用相同的 database service 函數

### 性能優化（可選）
如果列表頁報價單數量很大，可考慮：
1. 使用 JOIN 查詢一次性獲取所有關聯數據（需在 database service 中新增函數）
2. 實現分頁功能減少單次查詢數量

## 總結

遷移成功完成了以下目標：
- ✅ 移除了所有頁面組件中的 Supabase 數據查詢
- ✅ 改用 Zeabur PostgreSQL 直連
- ✅ 保留了 Supabase 認證
- ✅ 保持了數據結構兼容性
- ✅ 確保了多租戶安全性
- ✅ 保留了所有 UI 和國際化功能
