# React Hooks 使用指南

本目錄包含報價單系統的業務邏輯 hooks，這些 hooks 使用 React Query 進行資料管理和快取。

## 📦 已實作的 Hooks

### 1. 客戶管理 (`useCustomers.ts`)

提供完整的客戶 CRUD 操作：

```tsx
import {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useSearchCustomers,
} from '@/hooks/useCustomers'

// 取得客戶列表
const { data: customers, isLoading } = useCustomers()

// 取得單一客戶
const { data: customer } = useCustomer(customerId)

// 建立客戶
const createCustomer = useCreateCustomer()
await createCustomer.mutateAsync(data)

// 更新客戶
const updateCustomer = useUpdateCustomer(customerId)
await updateCustomer.mutateAsync(data)

// 刪除客戶（含樂觀更新）
const deleteCustomer = useDeleteCustomer()
await deleteCustomer.mutateAsync(customerId)

// 搜尋客戶
const { data: filtered } = useSearchCustomers(searchTerm)
```

### 2. 產品管理 (`useProducts.ts`)

包含權限控制的產品管理：

```tsx
import {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useFilteredProducts,
  useProductCategories,
} from '@/hooks/useProducts'

// 取得產品列表（自動處理成本顯示權限）
const { data: products, canSeeCost } = useProducts()

// 建立產品
const createProduct = useCreateProduct()
await createProduct.mutateAsync(data)

// 過濾產品
const { data: filtered } = useFilteredProducts({
  category: 'electronics',
  minPrice: 100,
  maxPrice: 1000,
})

// 取得所有分類
const { data: categories } = useProductCategories()
```

### 3. 報價單管理 (`useQuotations.ts`)

報價單完整生命週期管理：

```tsx
import {
  useQuotations,
  useQuotation,
  useCreateQuotation,
  useUpdateQuotation,
  useDeleteQuotation,
  useSendQuotation,
  useConvertToContract,
  useExportQuotationPDF,
  useBatchDeleteQuotations,
  useBatchUpdateStatus,
  useBatchExportPDFs,
} from '@/hooks/useQuotations'

// 取得報價單列表（含過濾）
const { data: quotations } = useQuotations({ status: 'draft' })

// 建立報價單
const createQuotation = useCreateQuotation()
await createQuotation.mutateAsync(data)

// 發送報價單
const sendQuotation = useSendQuotation(quotationId)
await sendQuotation.mutateAsync()

// 轉換為合約
const convertToContract = useConvertToContract(quotationId)
await convertToContract.mutateAsync()

// 匯出 PDF
const exportPDF = useExportQuotationPDF(quotationId)
await exportPDF.mutateAsync('zh') // 或 'en'

// 批次刪除
const batchDelete = useBatchDeleteQuotations()
await batchDelete.mutateAsync({ ids: [...] })
```

### 4. 合約管理 (`useContracts.ts`)

合約與付款進度追蹤：

```tsx
import {
  useContracts,
  useContractDetail,
  useOverdueContracts,
  useCreateContractFromQuotation,
  useUpdateNextCollection,
  useContractProgress,
  useExpiringContracts,
} from '@/hooks/useContracts'

// 取得合約列表
const { data: contracts } = useContracts({ status: 'active' })

// 取得合約詳情（含付款進度）
const { contract, progress, isLoading } = useContractDetail(contractId)

// 取得逾期合約
const { data: overdue } = useOverdueContracts()

// 從報價單建立合約
const createContract = useCreateContractFromQuotation()
await createContract.mutateAsync({
  quotation_id: quotationId,
  signed_date: '2025-01-01',
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  payment_terms: 'monthly',
})

// 更新下次收款資訊
const updateCollection = useUpdateNextCollection(contractId)
await updateCollection.mutateAsync({
  next_collection_date: '2025-02-01',
  next_collection_amount: 10000,
})

// 取得即將到期的合約（30 天內）
const { data: expiring } = useExpiringContracts()
```

### 5. 付款管理 (`usePayments.ts`)

收款記錄與統計：

```tsx
import {
  usePayments,
  useCollectedPayments,
  useUnpaidPayments,
  usePaymentReminders,
  useCreatePayment,
  useMarkPaymentAsOverdue,
  usePaymentStatistics,
  useCustomerPayments,
  useContractPayments,
} from '@/hooks/usePayments'

// 取得收款記錄
const { data: payments } = usePayments({ status: 'confirmed' })

// 取得已收款記錄
const { data: collected } = useCollectedPayments()

// 取得未收款記錄（超過 30 天）
const { data: unpaid } = useUnpaidPayments()

// 取得收款提醒（未來 30 天內到期）
const { data: reminders } = usePaymentReminders()

// 記錄收款
const recordPayment = useCreatePayment()
await recordPayment.mutateAsync({
  customer_id: customerId,
  contract_id: contractId,
  payment_type: 'installment',
  payment_date: '2025-01-01',
  amount: 10000,
  currency: 'TWD',
})

// 取得收款統計
const { data: stats } = usePaymentStatistics()

// 取得特定客戶/合約的收款記錄
const { data: customerPayments } = useCustomerPayments(customerId)
const { data: contractPayments } = useContractPayments(contractId)
```

### 6. 權限管理 (`usePermission.ts`)

權限檢查工具：

```tsx
import {
  usePermission,
  useCanViewCost,
  useCanManageUsers,
  useCanAssignRoles,
} from '@/hooks/usePermission'

// 檢查特定權限
const { hasPermission, loading } = usePermission('products', 'write')

// 快捷權限檢查
const { hasPermission: canSeeCost } = useCanViewCost()
const { hasPermission: canManage } = useCanManageUsers()
const { hasPermission: canAssign } = useCanAssignRoles()

// 條件渲染
{hasPermission && <Button>編輯</Button>}
```

## 🚀 使用範例

### 完整的表單提交範例

```tsx
'use client'

import { useCreateCustomer } from '@/hooks/useCustomers'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const schema = z.object({
  name: z.object({
    zh: z.string().min(1, '請輸入中文名稱'),
    en: z.string().min(1, '請輸入英文名稱'),
  }),
  email: z.string().email('Email 格式不正確'),
  phone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CreateCustomerForm() {
  const createCustomer = useCreateCustomer()
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createCustomer.mutateAsync(data)
      toast.success('客戶建立成功')
      router.push('/customers')
    } catch (error) {
      toast.error(error.message || '建立失敗')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* 表單欄位 */}
      <button
        type="submit"
        disabled={createCustomer.isPending}
      >
        {createCustomer.isPending ? '建立中...' : '建立客戶'}
      </button>
    </form>
  )
}
```

### 列表與搜尋範例

```tsx
'use client'

import { useState } from 'react'
import { useSearchCustomers, useDeleteCustomer } from '@/hooks/useCustomers'
import { toast } from 'sonner'

export function CustomerList() {
  const [search, setSearch] = useState('')
  const { data: customers, isLoading, error } = useSearchCustomers(search)
  const deleteCustomer = useDeleteCustomer()

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此客戶？')) return

    try {
      await deleteCustomer.mutateAsync(id)
      toast.success('刪除成功')
    } catch (error) {
      toast.error('刪除失敗')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜尋客戶..."
      />

      {customers?.map((customer) => (
        <div key={customer.id}>
          <h3>{customer.name.zh}</h3>
          <p>{customer.email}</p>
          <button onClick={() => handleDelete(customer.id)}>
            刪除
          </button>
        </div>
      ))}
    </div>
  )
}
```

## ⚙️ 快取設定

所有 hooks 使用以下快取策略：

- **客戶/產品/合約**: `staleTime: 5 分鐘`
- **報價單/付款記錄**: `staleTime: 2 分鐘`
- **統計資料**: `staleTime: 5 分鐘`, `refetchInterval: 10 分鐘`
- **逾期提醒**: 自動每 5 分鐘重新取得

可以根據需求調整這些設定。

## 🔄 樂觀更新

刪除操作使用樂觀更新，立即從 UI 移除項目，如果失敗則自動還原。

```tsx
const deleteCustomer = useDeleteCustomer()

// 樂觀更新會：
// 1. 立即從 UI 移除
// 2. 發送 API 請求
// 3. 如果失敗，自動還原
await deleteCustomer.mutateAsync(id)
```

## 📝 錯誤處理

所有 hooks 都包含完整的錯誤處理：

```tsx
const mutation = useCreateCustomer()

try {
  await mutation.mutateAsync(data)
  toast.success('成功')
} catch (error) {
  // 錯誤會包含來自 API 的訊息
  toast.error(error.message)
}

// 或使用 mutation 狀態
if (mutation.isError) {
  console.error(mutation.error)
}
```

## 🎯 最佳實踐

1. **使用 TypeScript**: 所有 hooks 都有完整的型別定義
2. **錯誤處理**: 總是處理 mutation 錯誤
3. **Loading 狀態**: 使用 `isLoading` 和 `isPending` 顯示載入狀態
4. **樂觀更新**: 適當使用樂觀更新提升 UX
5. **快取失效**: Mutation 成功後自動更新相關快取

## 📚 相關文件

- [API 架構文件](/docs/API_ARCHITECTURE.md)
- [前端整合指南](/docs/FRONTEND_INTEGRATION_GUIDE.md)
- [React Query 文件](https://tanstack.com/query/latest/docs/react/overview)

## 🔗 相依套件

這些 hooks 需要以下套件：

- `@tanstack/react-query` - 資料管理
- `@/types/database.types` - 型別定義
- `@/types/extended.types` - 擴展型別定義

確保專案中已安裝並配置 React Query Provider。
