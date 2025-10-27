# 報價單管理模組整合文檔

> 完成日期：2025-10-25
> 狀態：✅ 已完成

## 概述

報價單管理模組已完整整合到新的 API hooks 系統中，包括列表、詳情、創建、編輯和批次操作等所有功能。這是系統中最複雜的模組，涉及多個相關實體（客戶、產品、行項目）和複雜的業務邏輯。

## 整合範圍

### 1. 報價單列表頁面
**檔案**: `app/[locale]/quotations/page.tsx`

**變更**:
- 移除伺服器端資料獲取邏輯
- 簡化為純粹的 layout 頁面
- 將資料獲取責任完全轉移到客戶端

**使用的 Hooks**:
- 無（由 QuotationList 元件處理）

---

### 2. 報價單列表元件
**檔案**: `app/[locale]/quotations/QuotationList.tsx`

**使用的 Hooks**:
```typescript
import {
  useQuotations,          // 獲取報價單列表
  useDeleteQuotation,     // 刪除單一報價單
  useBatchDeleteQuotations, // 批次刪除
  useBatchUpdateStatus,   // 批次更新狀態
  useBatchExportPDFs,     // 批次匯出 PDF
  type Quotation,
  type QuotationStatus,
} from '@/hooks/useQuotations'
```

**主要功能**:
- ✅ 狀態過濾（draft, sent, accepted, rejected）
- ✅ 批次選擇模式
- ✅ 批次刪除（含確認彈窗）
- ✅ 批次更新狀態
- ✅ 批次匯出 PDF（ZIP）
- ✅ 單一刪除（樂觀更新）
- ✅ 載入和錯誤狀態處理
- ✅ 空狀態處理
- ✅ Toast 通知反饋

**範例**:
```typescript
// 獲取報價單列表（含過濾）
const { data: quotations = [], isLoading, error } = useQuotations(
  statusFilter !== 'all' ? { status: statusFilter as QuotationStatus } : undefined
)

// 批次刪除
const handleBatchDelete = async () => {
  const result = await batchDelete.mutateAsync({ ids: Array.from(selectedIds) })
  toast.success(`已刪除 ${result.deleted} 個報價單`)
}

// 批次匯出 PDF
await batchExport.mutateAsync({
  ids: Array.from(selectedIds),
  locale: locale as 'zh' | 'en',
})
```

---

### 3. 報價單詳情頁面
**檔案**: `app/[locale]/quotations/[id]/page.tsx`

**變更**:
- 移除複雜的伺服器端資料組合邏輯
- 傳遞 `quotationId` 到客戶端元件

---

### 4. 報價單詳情元件
**檔案**: `app/[locale]/quotations/[id]/QuotationDetail.tsx`

**使用的 Hooks**:
```typescript
import {
  useQuotation,           // 獲取單一報價單
  useUpdateQuotation,     // 更新報價單
  useSendQuotation,       // 發送報價單（狀態 → sent）
  useConvertToContract,   // 轉換為合約
  useExportQuotationPDF,  // 匯出 PDF
  type QuotationStatus,
} from '@/hooks/useQuotations'
```

**主要功能**:
- ✅ 顯示報價單詳細資訊
- ✅ 狀態轉換按鈕（基於當前狀態）
  - draft → 發送
  - sent → 接受/拒絕
  - accepted → 轉換為合約
- ✅ 匯出中/英文 PDF
- ✅ 編輯按鈕
- ✅ 自動處理過期狀態
- ✅ 載入和錯誤處理

**狀態轉換邏輯**:
```typescript
// 發送報價單
if (quotation.status === 'draft') {
  await sendQuotation.mutateAsync()
}

// 接受/拒絕
if (quotation.status === 'sent') {
  await updateQuotation.mutateAsync({ status: 'accepted' })
  // 或
  await updateQuotation.mutateAsync({ status: 'rejected' })
}

// 轉換為合約
if (quotation.status === 'accepted') {
  await convertToContract.mutateAsync()
  router.push('/contracts')
}
```

---

### 5. 報價單表單元件
**檔案**: `app/[locale]/quotations/QuotationForm.tsx`

**使用的 Hooks**:
```typescript
import {
  useCreateQuotation,     // 創建報價單
  useUpdateQuotation,     // 更新報價單
  useQuotation,           // 獲取報價單（編輯模式）
  type CreateQuotationItemInput,
  type BilingualText,
} from '@/hooks/useQuotations'
import { useCustomers } from '@/hooks/useCustomers'
import { useProducts } from '@/hooks/useProducts'
```

**重構成果**:
- 原始行數：837 行
- 重構後：525 行
- 減少：37.4%

**保留功能**:
- ✅ 客戶選擇（Combobox 搜尋）
- ✅ 產品選擇（下拉選單）
- ✅ 行項目動態管理
- ✅ 自動計算金額
- ✅ 表單驗證
- ✅ 創建和編輯模式
- ✅ Toast 通知

**簡化移除**:
- ❌ 匯率轉換（可後續單獨實作）
- ❌ 備註模板系統（可後續單獨實作）
- ❌ 複雜的客戶資訊顯示

**行項目管理**:
```typescript
interface QuotationItem {
  product_id: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number  // 自動計算: quantity × unit_price - discount
}

// 新增行項目
const handleAddItem = () => {
  setItems([...items, {
    product_id: '',
    quantity: 1,
    unit_price: 0,
    discount: 0,
    subtotal: 0,
  }])
}

// 自動計算小計
if (field === 'quantity' || field === 'unit_price' || field === 'discount') {
  const item = newItems[index]
  newItems[index].subtotal =
    parseFloat(item.quantity) * parseFloat(item.unit_price)
    - parseFloat(item.discount)
}

// 選擇產品自動填入單價
if (field === 'product_id') {
  const product = products.find(p => p.id === value)
  if (product) {
    newItems[index].unit_price = product.unit_price
    // 重新計算小計
  }
}
```

**總計計算**:
```typescript
const calculateTotals = () => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const taxRate = parseFloat(formData.taxRate) || 0
  const taxAmount = (subtotal * taxRate) / 100
  const total = subtotal + taxAmount
  return { subtotal, taxAmount, total }
}
```

**表單提交**:
```typescript
const quotationData = {
  customer_id: formData.customerId,
  issue_date: formData.issueDate,
  valid_until: formData.validUntil,
  currency: formData.currency,
  subtotal,
  tax_rate: parseFloat(formData.taxRate),
  tax_amount: taxAmount,
  total,
  notes: formData.notes ? { zh: formData.notes, en: formData.notes } : undefined,
  items: items.map((item) => ({
    product_id: item.product_id || undefined,
    description: {
      zh: products.find(p => p.id === item.product_id)?.name?.zh || '',
      en: products.find(p => p.id === item.product_id)?.name?.en || '',
    },
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount: item.discount,
    amount: item.subtotal,
  })),
}

if (quotationId) {
  await updateQuotation.mutateAsync(quotationData)
} else {
  await createQuotation.mutateAsync(quotationData)
}
```

---

### 6. 創建頁面
**檔案**: `app/[locale]/quotations/new/page.tsx`

**變更**:
- 移除伺服器端資料獲取
- 表單自己使用 hooks 獲取客戶和產品

---

### 7. 編輯頁面
**檔案**: `app/[locale]/quotations/[id]/edit/page.tsx`

**變更**:
- 移除複雜的資料組合邏輯
- 僅傳遞 `quotationId` 給表單
- 表單自己使用 `useQuotation(id)` 獲取資料

---

## 技術實作細節

### 資料流向

```
Server Page (認證)
    ↓
Client Component (載入資料)
    ↓
React Query Hooks
    ↓
API Routes (/api/quotations/...)
    ↓
Database (Zeabur PostgreSQL)
```

### 快取策略

```typescript
// useQuotations
staleTime: 2 * 60 * 1000  // 2 分鐘

// 樂觀更新（刪除）
onMutate: async (id) => {
  await queryClient.cancelQueries({ queryKey: ['quotations'] })
  const previousQuotations = queryClient.getQueryData(['quotations'])

  queryClient.setQueryData(['quotations'], (old) =>
    old?.filter((q) => q.id !== id) ?? []
  )

  return { previousQuotations }
}

// 錯誤回滾
onError: (err, id, context) => {
  if (context?.previousQuotations) {
    queryClient.setQueryData(['quotations'], context.previousQuotations)
  }
}
```

### 錯誤處理

所有元件都實作了完整的錯誤處理：

1. **載入狀態**
```typescript
if (isLoading) {
  return <LoadingSpinner />
}
```

2. **錯誤狀態**
```typescript
if (error) {
  return <ErrorMessage error={error.message} />
}
```

3. **Toast 通知**
```typescript
try {
  await mutation.mutateAsync(data)
  toast.success('操作成功')
} catch (error) {
  toast.error('操作失敗')
}
```

---

## 使用範例

### 創建報價單

```typescript
import { useCreateQuotation } from '@/hooks/useQuotations'
import { toast } from 'sonner'

function CreateQuotationForm() {
  const createQuotation = useCreateQuotation()

  const handleSubmit = async (data) => {
    try {
      const quotation = await createQuotation.mutateAsync({
        customer_id: '...',
        issue_date: '2025-10-25',
        valid_until: '2025-11-01',
        currency: 'TWD',
        subtotal: 10000,
        tax_rate: 5,
        tax_amount: 500,
        total: 10500,
        items: [
          {
            product_id: '...',
            description: { zh: '產品名稱', en: 'Product Name' },
            quantity: 2,
            unit_price: 5000,
            discount: 0,
            amount: 10000,
          }
        ]
      })

      toast.success(`報價單 ${quotation.quotation_number} 已建立`)
      router.push('/quotations')
    } catch (error) {
      toast.error('建立失敗')
    }
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### 批次操作

```typescript
import { useBatchDeleteQuotations } from '@/hooks/useQuotations'

function QuotationList() {
  const batchDelete = useBatchDeleteQuotations()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleBatchDelete = async () => {
    const result = await batchDelete.mutateAsync({
      ids: Array.from(selectedIds)
    })
    toast.success(`已刪除 ${result.deleted} 個報價單`)
    setSelectedIds(new Set())
  }

  return (
    <>
      <button onClick={handleBatchDelete}>
        批次刪除 ({selectedIds.size})
      </button>
      {/* 列表和選擇框 */}
    </>
  )
}
```

### 狀態轉換

```typescript
import { useSendQuotation, useConvertToContract } from '@/hooks/useQuotations'

function QuotationActions({ quotation }) {
  const sendQuotation = useSendQuotation(quotation.id)
  const convertToContract = useConvertToContract(quotation.id)

  const handleSend = async () => {
    await sendQuotation.mutateAsync()
    toast.success('報價單已發送')
  }

  const handleConvert = async () => {
    await convertToContract.mutateAsync()
    toast.success('已轉換為合約')
    router.push('/contracts')
  }

  return (
    <>
      {quotation.status === 'draft' && (
        <Button onClick={handleSend}>發送</Button>
      )}
      {quotation.status === 'accepted' && (
        <Button onClick={handleConvert}>轉換為合約</Button>
      )}
    </>
  )
}
```

---

## 資料結構

### Quotation 型別

```typescript
export type Quotation = Database['public']['Tables']['quotations']['Row']

// 包含：
interface Quotation {
  id: string
  quotation_number: string
  customer_id: string
  issue_date: string
  valid_until: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes?: BilingualText
  created_at: string
  updated_at: string
}
```

### QuotationItem 型別

```typescript
export type QuotationItem = Database['public']['Tables']['quotation_items']['Row']

interface CreateQuotationItemInput {
  product_id?: string
  description: BilingualText
  quantity: number
  unit_price: number
  discount: number
  amount: number
}
```

---

## 效能優化

### 1. 快取策略
- 列表資料快取 2 分鐘
- 詳情資料快取 2 分鐘
- 自動失效和重新驗證

### 2. 樂觀更新
- 刪除操作立即更新 UI
- 失敗時自動回滾

### 3. 批次操作
- 單一 API 呼叫處理多筆資料
- 減少網路請求次數

### 4. 條件渲染
- 載入狀態避免不必要的渲染
- 錯誤狀態提前返回

---

## 測試建議

### 1. 功能測試
- [ ] 創建報價單（包含行項目）
- [ ] 編輯報價單
- [ ] 刪除報價單
- [ ] 批次刪除
- [ ] 批次更新狀態
- [ ] 批次匯出 PDF
- [ ] 狀態轉換（draft → sent → accepted）
- [ ] 轉換為合約
- [ ] 匯出中英文 PDF

### 2. 邊界測試
- [ ] 空報價單列表
- [ ] 無客戶時創建報價單
- [ ] 無產品時創建報價單
- [ ] 過期報價單顯示
- [ ] 大量行項目效能

### 3. 錯誤處理
- [ ] API 失敗時的錯誤訊息
- [ ] 網路斷線時的行為
- [ ] 表單驗證錯誤
- [ ] 權限不足的處理

---

## 已知限制

### 1. 簡化功能
- **匯率轉換**: 已移除，需要時可單獨實作
- **備註模板**: 已移除，需要時可單獨實作
- **客戶詳細資訊**: 僅顯示基本資訊

### 2. 待優化項目
- [ ] 行項目的 drag-and-drop 排序
- [ ] 更進階的搜尋和過濾
- [ ] 報價單複製功能
- [ ] 批次編輯功能
- [ ] 更詳細的變更歷史

---

## 相關文檔

- [API 整合快速入門](./API_INTEGRATION_QUICKSTART.md)
- [客戶整合範例](./CUSTOMER_INTEGRATION.md)
- [產品整合範例](./PRODUCT_INTEGRATION.md)
- [API Hooks 使用指南](./API_HOOKS_GUIDE.md)

---

## 總結

報價單管理模組的整合是此專案中最複雜的任務之一，涉及：

- ✅ 5 個頁面元件
- ✅ 3 個主要元件（List, Detail, Form）
- ✅ 10+ 個 API hooks
- ✅ 批次操作支援
- ✅ 複雜的表單邏輯
- ✅ 多重狀態管理

透過系統化的整合，我們成功地：

1. **減少程式碼複雜度**: QuotationForm 從 837 行減少到 525 行
2. **提升可維護性**: 統一的資料獲取模式
3. **改善使用者體驗**: 載入狀態、錯誤處理、Toast 通知
4. **確保型別安全**: 完整的 TypeScript 支援
5. **優化效能**: 快取策略和樂觀更新

這個整合為後續功能開發和維護奠定了堅實的基礎。
