# API 整合快速入門

> 5 分鐘內開始使用 API 整合架構

**版本**: 1.0.0
**建立日期**: 2025-10-24

---

## 📦 第一步：安裝依賴

API 整合架構已內建於專案中，只需確認 React Query 已安裝：

```bash
npm install
```

依賴已包含：
- `@tanstack/react-query` - 資料快取和狀態管理
- `@tanstack/react-query-devtools` - 開發工具（可選）

---

## 🔧 第二步：設定 Providers

在主要 layout 中包裝 Providers（如果尚未設定）：

```typescript
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

✅ 這會自動啟用：
- React Query 資料快取
- 開發工具（開發環境）
- 自動錯誤處理

---

## 🚀 第三步：開始使用

### 範例 1：顯示客戶列表

```typescript
// app/[locale]/customers/CustomerList.tsx
'use client'

import { useApi } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import type { Customer } from '@/types/extended.types'

export function CustomerList() {
  // 使用 useApi 取得資料
  const { data: customers, isLoading, error } = useApi<Customer[]>(
    '/customers',
    queryKeys.customers.lists()
  )

  // Loading 狀態
  if (isLoading) {
    return <div className="text-center p-4">載入中...</div>
  }

  // 錯誤狀態
  if (error) {
    return <div className="text-red-600 p-4">錯誤：{error.message}</div>
  }

  // 顯示資料
  return (
    <div className="grid gap-4">
      {customers?.map(customer => (
        <div key={customer.id} className="border p-4 rounded">
          <h3 className="font-bold">{customer.name.zh}</h3>
          <p className="text-gray-600">{customer.email}</p>
        </div>
      ))}
    </div>
  )
}
```

**這段程式碼做了什麼？**
- ✅ 自動從 `/api/customers` 取得資料
- ✅ 資料快取 5 分鐘（避免重複請求）
- ✅ 自動處理 Loading 和 Error 狀態
- ✅ 完整的 TypeScript 型別支援

### 範例 2：建立新客戶

```typescript
// app/[locale]/customers/CreateCustomerForm.tsx
'use client'

import { useCreate } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface CreateCustomerData {
  name: { zh: string; en: string }
  email: string
  phone?: string
}

export function CreateCustomerForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<CreateCustomerData>({
    name: { zh: '', en: '' },
    email: '',
    phone: '',
  })

  // 使用 useCreate hook
  const createCustomer = useCreate<Customer, CreateCustomerData>(
    '/customers',
    {
      // 成功後自動使客戶列表快取失效
      invalidateKeys: [queryKeys.customers.all],
      // 成功訊息（可選）
      onSuccessMessage: '客戶建立成功',
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const customer = await createCustomer.mutateAsync(formData)
      // 導向到客戶詳情頁
      router.push(`/customers/${customer.id}`)
    } catch (error) {
      // 錯誤已在 hook 中處理
      console.error('建立失敗', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">中文名稱</label>
        <input
          type="text"
          value={formData.name.zh}
          onChange={(e) => setFormData({
            ...formData,
            name: { ...formData.name, zh: e.target.value }
          })}
          className="mt-1 block w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full border rounded px-3 py-2"
          required
        />
      </div>

      <button
        type="submit"
        disabled={createCustomer.isPending}
        className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {createCustomer.isPending ? '建立中...' : '建立客戶'}
      </button>
    </form>
  )
}
```

**這段程式碼做了什麼？**
- ✅ 發送 POST 請求到 `/api/customers`
- ✅ 建立成功後自動更新客戶列表
- ✅ 自動處理 Loading 狀態（按鈕禁用）
- ✅ 錯誤自動處理和顯示

### 範例 3：刪除客戶

```typescript
// components/DeleteCustomerButton.tsx
'use client'

import { useDelete } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'

interface DeleteCustomerButtonProps {
  customerId: string
  customerName: string
}

export function DeleteCustomerButton({
  customerId,
  customerName,
}: DeleteCustomerButtonProps) {
  const deleteCustomer = useDelete(
    (id) => `/customers/${id}`,
    {
      invalidateKeys: [queryKeys.customers.all],
      onSuccessMessage: '客戶已刪除',
    }
  )

  const handleDelete = async () => {
    // 確認對話框
    if (!confirm(`確定要刪除客戶「${customerName}」嗎？`)) {
      return
    }

    try {
      await deleteCustomer.mutateAsync(customerId)
    } catch (error) {
      // 錯誤已處理
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleteCustomer.isPending}
      className="text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {deleteCustomer.isPending ? '刪除中...' : '刪除'}
    </button>
  )
}
```

---

## 📚 常用模式

### 模式 1：搜尋列表

```typescript
'use client'

import { useState } from 'react'
import { useApi } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'

export function SearchableList() {
  const [search, setSearch] = useState('')

  // 每次 search 改變時會自動重新取得資料
  const { data, isLoading } = useApi<Customer[]>(
    `/customers?search=${search}`,
    queryKeys.customers.list({ search })
  )

  return (
    <div>
      <input
        type="search"
        placeholder="搜尋客戶..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded px-3 py-2"
      />

      {isLoading ? (
        <div>搜尋中...</div>
      ) : (
        data?.map(customer => (
          <div key={customer.id}>{customer.name.zh}</div>
        ))
      )}
    </div>
  )
}
```

### 模式 2：更新資料

```typescript
import { useUpdate } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'

export function UpdateCustomer({ customer }: { customer: Customer }) {
  const updateCustomer = useUpdate<Customer, Partial<Customer>>(
    (id) => `/customers/${id}`,
    {
      invalidateKeys: (data) => [
        queryKeys.customers.all,
        queryKeys.customers.detail(data.id),
      ],
    }
  )

  const handleUpdate = async () => {
    await updateCustomer.mutateAsync({
      id: customer.id,
      phone: '0912345678',
    })
  }

  return <button onClick={handleUpdate}>更新電話</button>
}
```

### 模式 3：樂觀更新

```typescript
import { useMutationApi } from '@/lib/api/hooks'
import { apiClient } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryClient'

export function ToggleFavorite({ customer }: { customer: Customer }) {
  const toggle = useMutationApi<Customer, boolean>(
    (favorite) => apiClient.patch(`/customers/${customer.id}`, { favorite }),
    {
      // 立即更新 UI（樂觀更新）
      optimisticUpdate: {
        queryKey: queryKeys.customers.detail(customer.id),
        updateFn: (old, favorite) => old ? { ...old, favorite } : old,
      },
      invalidateKeys: [queryKeys.customers.all],
    }
  )

  return (
    <button onClick={() => toggle.mutate(!customer.favorite)}>
      {customer.favorite ? '★' : '☆'}
    </button>
  )
}
```

---

## ✅ 檢查清單

完成以下步驟，確保整合成功：

- [ ] `npm install` 已執行
- [ ] `app/layout.tsx` 包含 `<Providers>`
- [ ] 可以在元件中使用 `useApi`
- [ ] 開發工具正常顯示（按 F12，查看 React Query 標籤）
- [ ] 資料自動快取（重新載入頁面時不會再次請求）

---

## 🆘 常見問題

### Q: 為什麼看不到 React Query Devtools？

A: 只在開發環境顯示。確認：
1. 執行 `npm run dev`
2. 開啟瀏覽器開發者工具（F12）
3. 查看左下角的浮動按鈕

### Q: 如何禁用快取？

A: 在 hook 中設定 `staleTime: 0`：

```typescript
useApi('/customers', queryKeys.customers.lists(), {
  staleTime: 0, // 立即過期
})
```

### Q: 如何手動重新取得資料？

A: 使用 `refetch` 函數：

```typescript
const { data, refetch } = useApi('/customers', queryKeys.customers.lists())

// 點擊按鈕重新取得
<button onClick={() => refetch()}>重新整理</button>
```

### Q: 錯誤訊息在哪裡顯示？

A: 預設會記錄到 console。要顯示 Toast 通知，需要整合 `react-hot-toast`：

```bash
npm install react-hot-toast
```

```typescript
// app/layout.tsx
import { Toaster } from 'react-hot-toast'

<Providers>
  {children}
  <Toaster />
</Providers>
```

然後在 hook 中：

```typescript
import toast from 'react-hot-toast'

const create = useCreate('/customers', {
  onSuccess: () => toast.success('建立成功'),
  onError: (error) => toast.error(error.message),
})
```

---

## 📖 下一步

- 閱讀 [完整 API 參考](/docs/API_CLIENT_README.md)
- 查看 [實戰範例集](/docs/API_INTEGRATION_EXAMPLES.md)
- 學習 [進階用法](/docs/API_CLIENT_README.md#進階用法)

---

**維護者**: Claude
**最後更新**: 2025-10-24
