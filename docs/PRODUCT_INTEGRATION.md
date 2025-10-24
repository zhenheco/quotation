# 產品管理模組 - API Hooks 整合文檔

> 最後更新：2025-10-25
> 狀態：✅ 已完成整合

## 整合摘要

產品管理模組已成功整合到 React Query API hooks 系統中，提供完整的資料管理、快取策略和權限控制。

## 架構概覽

```
/app/[locale]/products/
├── page.tsx              ✅ 列表頁（使用 useFilteredProducts）
├── new/page.tsx          ✅ 新增頁（使用 ProductForm）
├── [id]/page.tsx         ✅ 編輯頁（使用 useProduct）
├── ProductList.tsx       ✅ 列表元件（使用 hooks）
└── ProductForm.tsx       ✅ 表單元件（使用 hooks）

/hooks/
└── useProducts.ts        ✅ 產品管理 API hooks
```

## 已整合的 Hooks

### 1. 資料查詢 Hooks

#### `useProducts()`
取得所有產品列表，自動處理成本權限。

**使用位置**：
- `ProductList.tsx` - 透過 `useFilteredProducts` 間接使用

**功能**：
- ✅ 自動載入所有產品
- ✅ 5 分鐘快取策略
- ✅ 自動檢查成本價查看權限
- ✅ 錯誤處理

#### `useProduct(id)`
取得單一產品詳情。

**使用位置**：
- `app/[locale]/products/[id]/page.tsx` - 編輯頁面
- `ProductForm.tsx` - 表單元件（編輯模式）

**功能**：
- ✅ 載入單一產品資料
- ✅ 自動快取
- ✅ 權限控制整合
- ✅ 條件查詢（僅在有 ID 時執行）

#### `useFilteredProducts(filters)`
前端過濾產品列表。

**使用位置**：
- `ProductList.tsx` - 主要列表元件

**支援的過濾條件**：
```typescript
interface ProductFilters {
  category?: string    // 分類過濾
  minPrice?: number    // 最低價格
  maxPrice?: number    // 最高價格
  search?: string      // 搜尋（名稱、描述、SKU、分類）
}
```

**功能**：
- ✅ 多條件過濾
- ✅ 即時搜尋（前端）
- ✅ 分類篩選
- ✅ 價格範圍篩選

#### `useProductCategories()`
取得所有產品分類。

**使用位置**：
- `ProductList.tsx` - 分類下拉選單

**功能**：
- ✅ 自動從產品列表提取分類
- ✅ 去重處理
- ✅ 動態更新

### 2. 資料變更 Hooks

#### `useCreateProduct()`
建立新產品。

**使用位置**：
- `ProductForm.tsx` - 新增模式

**功能**：
- ✅ 建立產品
- ✅ 自動更新快取
- ✅ 樂觀更新
- ✅ 錯誤回滾

**使用範例**：
```typescript
const createProduct = useCreateProduct()

const handleSubmit = async (data: CreateProductInput) => {
  try {
    await createProduct.mutateAsync(data)
    toast.success('產品建立成功')
    router.push('/products')
  } catch (error) {
    toast.error('建立失敗')
  }
}
```

#### `useUpdateProduct(id)`
更新產品資料。

**使用位置**：
- `ProductForm.tsx` - 編輯模式

**功能**：
- ✅ 更新產品
- ✅ 自動失效相關快取
- ✅ 即時更新 UI
- ✅ 權限檢查整合

**使用範例**：
```typescript
const updateProduct = useUpdateProduct(product.id)

const handleSubmit = async (data: UpdateProductInput) => {
  try {
    await updateProduct.mutateAsync(data)
    toast.success('更新成功')
  } catch (error) {
    toast.error('更新失敗')
  }
}
```

#### `useDeleteProduct()`
刪除產品（含樂觀更新）。

**使用位置**：
- `ProductList.tsx` - 列表和卡片視圖

**功能**：
- ✅ 刪除產品
- ✅ 樂觀 UI 更新
- ✅ 錯誤自動回滾
- ✅ 關聯檢查（報價單使用中）

**使用範例**：
```typescript
const deleteProduct = useDeleteProduct()

const handleDelete = async (id: string) => {
  try {
    await deleteProduct.mutateAsync(id)
    toast.success('刪除成功')
  } catch (error) {
    toast.error('刪除失敗：可能有報價單正在使用此產品')
  }
}
```

### 3. 工具函數

#### `calculateProfitMargin(costPrice, sellingPrice)`
計算利潤率。

**使用位置**：
- `ProductForm.tsx` - 自動計算利潤率

**功能**：
```typescript
// 利潤率 = (售價 - 成本) / 成本 × 100
const margin = calculateProfitMargin(100, 150) // 50%
```

#### `calculateSellingPrice(costPrice, profitMargin)`
根據成本和利潤率計算售價。

**使用位置**：
- `ProductForm.tsx` - 自動計算售價

**功能**：
```typescript
// 售價 = 成本 × (1 + 利潤率 / 100)
const price = calculateSellingPrice(100, 50) // 150
```

## 權限控制整合

### 成本價權限

產品模組實作了完整的成本價權限控制：

#### 1. 查看權限 (`products:read_cost`)

**檢查位置**：
- `useProducts()` - 自動檢查並返回 `canSeeCost`
- `useProduct()` - 單一產品查詢時檢查
- `ProductForm.tsx` - 表單顯示/隱藏成本欄位
- `ProductList.tsx` - 列表顯示/隱藏成本列

**行為**：
```typescript
const { data: products, canSeeCost } = useProducts()

// 根據權限顯示成本
{canSeeCost && (
  <div>
    <p>成本價: {product.cost_price}</p>
    <p>利潤率: {product.profit_margin}%</p>
  </div>
)}
```

#### 2. 編輯權限 (`products:write_cost`)

**檢查位置**：
- `ProductForm.tsx` - 決定成本欄位是否可編輯

**行為**：
- **有編輯權限**：顯示完整的成本輸入表單
- **僅查看權限**：顯示唯讀的成本資訊
- **無權限**：完全隱藏成本區塊

**實作範例**：
```typescript
const { hasPermission: canSeeCost } = usePermission('products', 'read_cost')
const { hasPermission: canEditCost } = usePermission('products', 'write_cost')

{canSeeCost && (
  <div>
    {canEditCost ? (
      <CostInputForm />  // 可編輯表單
    ) : (
      <CostReadOnlyView />  // 唯讀顯示
    )}
  </div>
)}
```

## UI 功能特性

### 1. 產品列表 (`ProductList.tsx`)

#### 視圖模式
- ✅ **列表視圖**：表格形式，適合大量資料瀏覽
- ✅ **卡片視圖**：卡片形式，視覺化呈現

#### 搜尋與篩選
- ✅ **即時搜尋**：搜尋名稱、描述、SKU、分類
- ✅ **分類篩選**：下拉選單選擇分類
- ✅ **價格範圍**：支援最低/最高價格篩選（未啟用 UI）

#### 載入狀態
```typescript
if (isLoading) {
  return <LoadingSpinner />  // 載入指示器
}

if (error) {
  return <ErrorMessage error={error} />  // 錯誤訊息
}

if (!products || products.length === 0) {
  return <EmptyState />  // 空狀態
}
```

#### 成本資訊顯示
- **有權限**：顯示成本價和利潤率
- **無權限**：隱藏成本欄位
- **利潤率計算**：僅在幣別相同時顯示

### 2. 產品表單 (`ProductForm.tsx`)

#### 雙語輸入
使用 `BilingualFormInput` 元件支援中英文輸入：
```typescript
<BilingualFormInput
  label={t('product.name')}
  valueZh={formData.nameZh}
  valueEn={formData.nameEn}
  onChangeZh={(value) => setFormData({ ...formData, nameZh: value })}
  onChangeEn={(value) => setFormData({ ...formData, nameEn: value })}
  required
/>
```

#### 自動計算功能
表單支援兩種自動計算模式：

**模式 1：自動計算利潤率**
```typescript
// 當成本價或售價改變時
setAutoCalculateMode('profitMargin')
profitMargin = ((basePrice - costPrice) / costPrice) × 100
```

**模式 2：自動計算售價**
```typescript
// 當利潤率改變時
setAutoCalculateMode('sellingPrice')
basePrice = costPrice × (1 + profitMargin / 100)
```

#### 幣別檢查
- ✅ 僅在成本幣別和售價幣別相同時計算利潤率
- ✅ 不同幣別時不顯示利潤率計算區塊

#### 表單驗證
```typescript
// 基本價格驗證
if (isNaN(basePrice) || basePrice < 0) {
  toast.error(t('product.invalidPrice'))
  return
}

// 成本價驗證（有權限時）
if (canEditCost && formData.costPrice) {
  const costPrice = parseFloat(formData.costPrice)
  if (!isNaN(costPrice) && costPrice >= 0) {
    // 加入成本資料
  }
}
```

#### 權限控制的資料提交
```typescript
const productData = {
  name: { zh: '...', en: '...' },
  base_price: basePrice,
  // ...其他基本欄位
}

// 只有在有權限且有輸入時才加入成本欄位
if (canEditCost && formData.costPrice) {
  productData.cost_price = costPrice
  productData.cost_currency = formData.costCurrency
  productData.profit_margin = calculateProfitMargin(costPrice, basePrice)
}
```

### 3. 頁面整合

#### 列表頁面 (`page.tsx`)
```typescript
export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('product.title')}
        action={{
          label: t('product.createNew'),
          href: `/${locale}/products/new`,
        }}
      />
      <ProductList locale={locale} />
    </div>
  )
}
```

#### 新增頁面 (`new/page.tsx`)
```typescript
export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <PageHeader title={t('product.createNew')} />
      <ProductForm locale={locale} />
    </div>
  )
}
```

#### 編輯頁面 (`[id]/page.tsx`)
```typescript
export default function EditProductPage() {
  const { data: product, isLoading, error } = useProduct(id)

  if (isLoading) return <LoadingSpinner />
  if (error || !product) return notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={t('product.edit')} />
      <ProductForm locale={locale} product={product} />
    </div>
  )
}
```

## 快取策略

### Query 快取設定
```typescript
{
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 5 * 60 * 1000, // 5 分鐘內視為新鮮資料
}
```

### Mutation 後快取更新

#### 建立產品
```typescript
onSuccess: (newProduct) => {
  // 失效列表快取，觸發重新載入
  queryClient.invalidateQueries({ queryKey: ['products'] })

  // 直接設定新產品的快取
  queryClient.setQueryData(['products', newProduct.id], newProduct)
}
```

#### 更新產品
```typescript
onSuccess: (updatedProduct) => {
  // 失效列表和單一產品快取
  queryClient.invalidateQueries({ queryKey: ['products'] })
  queryClient.setQueryData(['products', id], updatedProduct)
}
```

#### 刪除產品（樂觀更新）
```typescript
// 1. 立即更新 UI（樂觀更新）
onMutate: async (id) => {
  await queryClient.cancelQueries({ queryKey: ['products'] })
  const previousProducts = queryClient.getQueryData(['products'])

  // 立即從列表移除
  queryClient.setQueryData(['products'], (old) =>
    old?.filter((p) => p.id !== id) ?? []
  )

  return { previousProducts }
}

// 2. 錯誤時回滾
onError: (err, id, context) => {
  queryClient.setQueryData(['products'], context.previousProducts)
}

// 3. 完成後重新驗證
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['products'] })
}
```

## 錯誤處理

### API 錯誤處理
```typescript
async function fetchProducts() {
  const response = await fetch('/api/products')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch products')
  }
  return response.json()
}
```

### UI 錯誤顯示
```typescript
if (error) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      {error instanceof Error ? error.message : t('common.error')}
    </div>
  )
}
```

### Mutation 錯誤處理
```typescript
try {
  await createProduct.mutateAsync(data)
  toast.success(t('product.createSuccess'))
  router.push('/products')
} catch (err) {
  console.error('Error saving product:', err)
  toast.error(err instanceof Error ? err.message : t('product.saveFailed'))
}
```

## 國際化支援

### 雙語資料結構
```typescript
interface BilingualText {
  zh: string
  en: string
}

// 產品名稱和描述使用雙語
{
  name: { zh: '筆記型電腦', en: 'Laptop' },
  description: { zh: '輕薄高效能', en: 'Slim and powerful' }
}
```

### UI 顯示
```typescript
const name = product.name as { zh: string; en: string }
const displayName = name[locale as 'zh' | 'en']
```

### 翻譯鍵值
使用 `next-intl` 進行翻譯：
```typescript
const t = useTranslations()

t('product.title')          // 產品管理
t('product.createNew')      // 建立新產品
t('product.name')           // 產品名稱
t('product.price')          // 價格
t('product.costPrice')      // 成本價
t('product.profitMargin')   // 利潤率
```

## 使用範例

### 完整的產品列表實作

```typescript
function ProductList({ locale }: { locale: string }) {
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
  })

  const {
    data: products,
    isLoading,
    error,
    canSeeCost
  } = useFilteredProducts(filters)

  const { data: categories } = useProductCategories()
  const deleteProduct = useDeleteProduct()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!products?.length) return <EmptyState />

  return (
    <div>
      {/* 搜尋和篩選 */}
      <input
        type="text"
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        placeholder="搜尋產品..."
      />

      <select
        value={filters.category}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
      >
        <option value="">所有分類</option>
        {categories?.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {/* 產品列表 */}
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          canSeeCost={canSeeCost}
          onDelete={async () => {
            await deleteProduct.mutateAsync(product.id)
          }}
        />
      ))}
    </div>
  )
}
```

### 完整的產品表單實作

```typescript
function ProductForm({ product }: { product?: Product }) {
  const { hasPermission: canSeeCost } = usePermission('products', 'read_cost')
  const { hasPermission: canEditCost } = usePermission('products', 'write_cost')

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(product?.id || '')

  const [formData, setFormData] = useState({
    nameZh: product?.name.zh || '',
    nameEn: product?.name.en || '',
    basePrice: product?.base_price?.toString() || '',
    costPrice: product?.cost_price?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data: CreateProductInput = {
      name: { zh: formData.nameZh, en: formData.nameEn },
      base_price: parseFloat(formData.basePrice),
      base_currency: 'TWD',
    }

    // 只有有權限時才加入成本
    if (canEditCost && formData.costPrice) {
      data.cost_price = parseFloat(formData.costPrice)
      data.profit_margin = calculateProfitMargin(
        data.cost_price,
        data.base_price
      )
    }

    try {
      if (product) {
        await updateProduct.mutateAsync(data)
        toast.success('更新成功')
      } else {
        await createProduct.mutateAsync(data)
        toast.success('建立成功')
      }
    } catch (error) {
      toast.error('操作失敗')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <BilingualFormInput
        label="產品名稱"
        valueZh={formData.nameZh}
        valueEn={formData.nameEn}
        onChangeZh={(v) => setFormData({ ...formData, nameZh: v })}
        onChangeEn={(v) => setFormData({ ...formData, nameEn: v })}
        required
      />

      <FormInput
        label="價格"
        type="number"
        value={formData.basePrice}
        onChange={(v) => setFormData({ ...formData, basePrice: v })}
        required
      />

      {canEditCost && (
        <FormInput
          label="成本價"
          type="number"
          value={formData.costPrice}
          onChange={(v) => setFormData({ ...formData, costPrice: v })}
        />
      )}

      <button type="submit">
        {product ? '更新' : '建立'}
      </button>
    </form>
  )
}
```

## 型別定義

### 產品型別
```typescript
// 資料庫型別（來自 Supabase）
export type Product = Database['public']['Tables']['products']['Row']

// 建立產品輸入
export interface CreateProductInput {
  name: BilingualText
  description?: BilingualText
  base_price: number
  base_currency: string
  category?: string
  cost_price?: number
  cost_currency?: string
  profit_margin?: number
  supplier?: string
  supplier_code?: string
  sku?: string
}

// 更新產品輸入（所有欄位可選）
export interface UpdateProductInput {
  name?: BilingualText
  description?: BilingualText
  base_price?: number
  base_currency?: string
  category?: string
  cost_price?: number
  cost_currency?: string
  profit_margin?: number
  supplier?: string
  supplier_code?: string
  sku?: string
}

// 過濾條件
export interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  search?: string
}

// 雙語文字
export interface BilingualText {
  zh: string
  en: string
}
```

## 效能優化

### 1. 快取策略
- ✅ 5 分鐘 staleTime，減少不必要的請求
- ✅ 智能快取失效，只在資料變更時重新載入
- ✅ 樂觀更新，立即反映 UI 變更

### 2. 前端過濾
- ✅ 使用前端過濾避免頻繁 API 請求
- ✅ 搜尋和篩選在客戶端執行
- ✅ 適合中小型產品列表（< 1000 筆）

### 3. 條件查詢
```typescript
useQuery({
  queryKey: ['products', id],
  queryFn: () => fetchProduct(id),
  enabled: !!id,  // 只在有 ID 時才執行
})
```

## 與其他模組的整合

### 報價單模組整合
產品在報價單中的使用：

```typescript
// 報價單行項目參考產品
interface QuotationItem {
  product_id: string  // 參考產品 ID
  product_name: BilingualText
  quantity: number
  unit_price: number
  currency: string
}

// 刪除產品前檢查是否被使用
async function deleteProduct(id: string) {
  // API 會檢查是否有報價單使用此產品
  // 如果有使用中的報價單，會拋出錯誤
  const response = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('無法刪除：產品正在使用中')
  }
}
```

## 最佳實踐

### 1. 權限檢查
```typescript
// ✅ 好的做法：使用 hook 自動檢查權限
const { data, canSeeCost } = useProducts()

// ❌ 避免：手動實作權限檢查
const products = await fetchProducts()
const canSeeCost = await checkPermission('products:read_cost')
```

### 2. 錯誤處理
```typescript
// ✅ 好的做法：顯示具體錯誤訊息
try {
  await createProduct.mutateAsync(data)
} catch (err) {
  toast.error(err instanceof Error ? err.message : '未知錯誤')
}

// ❌ 避免：忽略錯誤或顯示通用訊息
createProduct.mutate(data)
```

### 3. 表單狀態管理
```typescript
// ✅ 好的做法：使用 mutation 的 pending 狀態
const createProduct = useCreateProduct()
<button disabled={createProduct.isPending}>
  {createProduct.isPending ? '儲存中...' : '儲存'}
</button>

// ❌ 避免：手動管理 loading 狀態
const [isSubmitting, setIsSubmitting] = useState(false)
```

### 4. 快取使用
```typescript
// ✅ 好的做法：信任快取資料
const { data } = useProducts()
// 資料會自動在背景重新驗證

// ❌ 避免：每次都重新載入
useEffect(() => {
  fetchProducts()
}, [])
```

## 測試建議

### 單元測試
```typescript
// 測試 hook
test('useProducts returns products and canSeeCost flag', async () => {
  const { result } = renderHook(() => useProducts())

  await waitFor(() => {
    expect(result.current.data).toBeDefined()
    expect(result.current.canSeeCost).toBeDefined()
  })
})

// 測試工具函數
test('calculateProfitMargin calculates correctly', () => {
  expect(calculateProfitMargin(100, 150)).toBe(50)
  expect(calculateProfitMargin(0, 100)).toBe(0)
})
```

### 整合測試
```typescript
test('ProductList displays filtered products', async () => {
  render(<ProductList locale="zh" />)

  // 等待資料載入
  await waitFor(() => {
    expect(screen.getByText('產品A')).toBeInTheDocument()
  })

  // 測試搜尋
  const searchInput = screen.getByPlaceholderText('搜尋')
  fireEvent.change(searchInput, { target: { value: '產品A' } })

  expect(screen.getByText('產品A')).toBeInTheDocument()
  expect(screen.queryByText('產品B')).not.toBeInTheDocument()
})
```

## 故障排除

### 常見問題

#### 1. 產品列表不顯示成本價
**原因**：缺少 `products:read_cost` 權限
**解決**：檢查角色權限設定

#### 2. 建立產品失敗
**原因**：缺少必填欄位或權限不足
**解決**：
- 檢查 `name` 和 `base_price` 是否已填寫
- 如果包含成本價，檢查是否有 `products:write_cost` 權限

#### 3. 刪除產品失敗
**原因**：產品正在報價單中使用
**解決**：先移除或更新相關報價單

#### 4. 利潤率計算不正確
**原因**：成本幣別和售價幣別不同
**解決**：確保兩者使用相同幣別，或進行匯率轉換

## 未來改進建議

### 短期改進
1. ✨ 實作價格範圍篩選的 UI
2. ✨ 新增批次編輯功能
3. ✨ 支援產品圖片上傳
4. ✨ 實作產品歷史價格記錄

### 中期改進
1. 🚀 後端分頁支援（產品數量 > 1000 時）
2. 🚀 實作全文搜尋（PostgreSQL FTS）
3. 🚀 新增產品庫存管理
4. 🚀 支援產品變體（規格、尺寸等）

### 長期改進
1. 🎯 產品標籤系統
2. 🎯 進階分析和報表
3. 🎯 供應商整合
4. 🎯 價格自動更新機制

## 總結

產品管理模組已完整整合到 API hooks 系統，提供：

✅ **完整的 CRUD 操作**：建立、讀取、更新、刪除
✅ **智能快取管理**：自動快取、失效和重新驗證
✅ **權限控制**：成本價查看和編輯權限
✅ **樂觀更新**：立即 UI 反饋
✅ **錯誤處理**：完整的錯誤處理和回滾機制
✅ **國際化支援**：雙語資料和 UI
✅ **效能優化**：前端過濾、條件查詢
✅ **型別安全**：完整的 TypeScript 型別定義

這個整合為產品管理提供了穩定、高效且易於維護的基礎架構。
