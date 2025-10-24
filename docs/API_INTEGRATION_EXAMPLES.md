# API 整合使用範例

> 完整的 API 整合架構使用範例和最佳實踐

**版本**: 1.0.0
**建立日期**: 2025-10-24
**適用專案**: Quotation System

---

## 目錄

1. [快速開始](#快速開始)
2. [基礎使用](#基礎使用)
3. [進階功能](#進階功能)
4. [實戰範例](#實戰範例)
5. [最佳實踐](#最佳實踐)

---

## 快速開始

### 1. 安裝依賴

```bash
# 已包含在專案中
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### 2. 設定 Providers

在 `app/layout.tsx` 中包裝 Providers：

```typescript
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

### 3. 開始使用

```typescript
'use client'

import { useApi } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'

export function CustomerList() {
  const { data, isLoading, error } = useApi<Customer[]>(
    '/customers',
    queryKeys.customers.lists()
  )

  if (isLoading) return <div>載入中...</div>
  if (error) return <div>錯誤：{error.message}</div>

  return (
    <ul>
      {data?.map(customer => (
        <li key={customer.id}>{customer.name.zh}</li>
      ))}
    </ul>
  )
}
```

---

## 基礎使用

### GET - 取得資料

#### 取得列表

```typescript
'use client'

import { useList } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import type { Customer } from '@/types/extended.types'

export function CustomerList() {
  const { data: customers, isLoading, error } = useList<Customer>(
    '/customers',
    queryKeys.customers.lists()
  )

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      {customers?.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  )
}
```

#### 取得單一項目

```typescript
'use client'

import { useDetail } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import type { Customer } from '@/types/extended.types'

interface CustomerDetailProps {
  id: string
}

export function CustomerDetail({ id }: CustomerDetailProps) {
  const { data: customer, isLoading, error } = useDetail<Customer>(
    `/customers/${id}`,
    queryKeys.customers.detail(id)
  )

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!customer) return <NotFound />

  return (
    <div>
      <h1>{customer.name.zh}</h1>
      <p>Email: {customer.email}</p>
      <p>電話: {customer.phone}</p>
    </div>
  )
}
```

### POST - 建立資料

```typescript
'use client'

import { useCreate } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import type { Customer } from '@/types/extended.types'

interface CreateCustomerData {
  name: { zh: string; en: string }
  email: string
  phone?: string
}

export function CreateCustomerForm() {
  const router = useRouter()

  const createCustomer = useCreate<Customer, CreateCustomerData>(
    '/customers',
    {
      invalidateKeys: [queryKeys.customers.all],
      onSuccessMessage: '客戶建立成功',
      onErrorMessage: (error) => `建立失敗：${error.message}`,
    }
  )

  const handleSubmit = async (data: CreateCustomerData) => {
    try {
      const customer = await createCustomer.mutateAsync(data)
      router.push(`/customers/${customer.id}`)
    } catch (error) {
      // 錯誤已在 hook 中處理
    }
  }

  return (
    <form onSubmit={handleSubmit}>
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

### PUT - 更新資料

```typescript
'use client'

import { useUpdate } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import type { Customer } from '@/types/extended.types'

interface UpdateCustomerData {
  id: string
  name?: { zh: string; en: string }
  email?: string
  phone?: string
}

export function EditCustomerForm({ customer }: { customer: Customer }) {
  const updateCustomer = useUpdate<Customer, Omit<UpdateCustomerData, 'id'>>(
    (id) => `/customers/${id}`,
    {
      invalidateKeys: (data, variables) => [
        queryKeys.customers.all,
        queryKeys.customers.detail(variables.id),
      ],
      onSuccessMessage: '客戶更新成功',
    }
  )

  const handleSubmit = async (data: Omit<UpdateCustomerData, 'id'>) => {
    await updateCustomer.mutateAsync({
      id: customer.id,
      ...data,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 表單欄位 */}
    </form>
  )
}
```

### DELETE - 刪除資料

```typescript
'use client'

import { useDelete } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'

export function DeleteCustomerButton({ id }: { id: string }) {
  const router = useRouter()

  const deleteCustomer = useDelete(
    (id) => `/customers/${id}`,
    {
      invalidateKeys: [queryKeys.customers.all],
      onSuccessMessage: '客戶已刪除',
    }
  )

  const handleDelete = async () => {
    if (!confirm('確定要刪除此客戶嗎？')) return

    try {
      await deleteCustomer.mutateAsync(id)
      router.push('/customers')
    } catch (error) {
      // 錯誤已在 hook 中處理
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleteCustomer.isPending}
      className="text-red-600"
    >
      {deleteCustomer.isPending ? '刪除中...' : '刪除'}
    </button>
  )
}
```

---

## 進階功能

### 1. 分頁

```typescript
'use client'

import { usePaginatedList } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import { useState } from 'react'

export function PaginatedCustomerList() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = usePaginatedList<Customer>(
    '/customers',
    queryKeys.customers.list({ page, limit }),
    { page, limit }
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      {/* 列表 */}
      {data?.data.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}

      {/* 分頁控制 */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          上一頁
        </button>

        <span>
          第 {data?.pagination.page} / {data?.pagination.totalPages} 頁
        </span>

        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!data?.pagination.hasNext}
        >
          下一頁
        </button>
      </div>
    </div>
  )
}
```

### 2. 搜尋與排序

```typescript
'use client'

import { useSearchList } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import { useState, useMemo } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function SearchableCustomerList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 防抖搜尋詞
  const debouncedSearch = useDebounce(searchTerm, 500)

  const searchParams = useMemo(() => ({
    search: debouncedSearch,
    sort: { field: sortField, order: sortOrder },
    limit: 20,
  }), [debouncedSearch, sortField, sortOrder])

  const { data, isLoading } = useSearchList<Customer>(
    '/customers',
    queryKeys.customers.list(searchParams),
    searchParams
  )

  return (
    <div>
      {/* 搜尋輸入 */}
      <input
        type="search"
        placeholder="搜尋客戶..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* 排序控制 */}
      <select
        value={sortField}
        onChange={(e) => setSortField(e.target.value)}
      >
        <option value="created_at">建立時間</option>
        <option value="name">名稱</option>
        <option value="email">Email</option>
      </select>

      {/* 列表 */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        data?.data.map(customer => (
          <CustomerCard key={customer.id} customer={customer} />
        ))
      )}
    </div>
  )
}
```

### 3. 樂觀更新

```typescript
'use client'

import { useMutationApi } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import { apiClient } from '@/lib/api/client'

export function ToggleFavoriteButton({ customer }: { customer: Customer }) {
  const toggleFavorite = useMutationApi<Customer, { id: string; favorite: boolean }>(
    ({ id, favorite }) => apiClient.patch(`/customers/${id}`, { favorite }),
    {
      // 樂觀更新：立即更新 UI
      optimisticUpdate: {
        queryKey: queryKeys.customers.detail(customer.id),
        updateFn: (old, variables) => {
          if (!old) return old
          return { ...old, favorite: variables.favorite }
        },
      },
      invalidateKeys: [queryKeys.customers.all],
      onSuccessMessage: (data) =>
        data.favorite ? '已加入最愛' : '已移除最愛',
    }
  )

  return (
    <button
      onClick={() => toggleFavorite.mutate({
        id: customer.id,
        favorite: !customer.favorite,
      })}
      disabled={toggleFavorite.isPending}
    >
      {customer.favorite ? '★' : '☆'}
    </button>
  )
}
```

### 4. 批次操作

```typescript
'use client'

import { useBatchDelete } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import { useState } from 'react'

export function BatchDeleteCustomers({ customers }: { customers: Customer[] }) {
  const [selected, setSelected] = useState<string[]>([])

  const batchDelete = useBatchDelete(
    '/customers/batch/delete',
    {
      invalidateKeys: [queryKeys.customers.all],
      onSuccessMessage: (data) => `已刪除 ${data.deleted} 個客戶`,
    }
  )

  const handleBatchDelete = async () => {
    if (!confirm(`確定要刪除 ${selected.length} 個客戶嗎？`)) return

    try {
      await batchDelete.mutateAsync(selected)
      setSelected([])
    } catch (error) {
      // 錯誤已處理
    }
  }

  return (
    <div>
      <button
        onClick={handleBatchDelete}
        disabled={selected.length === 0 || batchDelete.isPending}
      >
        刪除選取 ({selected.length})
      </button>

      {customers.map(customer => (
        <div key={customer.id}>
          <input
            type="checkbox"
            checked={selected.includes(customer.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelected([...selected, customer.id])
              } else {
                setSelected(selected.filter(id => id !== customer.id))
              }
            }}
          />
          {customer.name.zh}
        </div>
      ))}
    </div>
  )
}
```

### 5. 檔案上傳

```typescript
'use client'

import { useFileUpload } from '@/lib/api/hooks'
import { useState } from 'react'

export function LogoUploader() {
  const [preview, setPreview] = useState<string | null>(null)

  const upload = useFileUpload('/api/upload', {
    onSuccessMessage: '檔案上傳成功',
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 驗證檔案
    if (!file.type.startsWith('image/')) {
      alert('只能上傳圖片')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('檔案大小不能超過 5MB')
      return
    }

    // 預覽
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // 上傳
    try {
      const result = await upload.mutateAsync(file)
      console.log('Uploaded:', result.url)
    } catch (error) {
      setPreview(null)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={upload.isPending}
      />

      {upload.isPending && <p>上傳中...</p>}

      {preview && (
        <img src={preview} alt="Preview" className="mt-4 max-w-xs" />
      )}
    </div>
  )
}
```

### 6. 輪詢

```typescript
'use client'

import { usePolling } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'

interface JobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
}

export function JobMonitor({ jobId }: { jobId: string }) {
  const { data: job, isLoading } = usePolling<JobStatus>(
    `/jobs/${jobId}`,
    queryKeys.admin.all, // 使用適當的 query key
    3000, // 每 3 秒輪詢一次
    {
      // 當工作完成時停止輪詢
      enabled: !!jobId,
      refetchInterval: (data) => {
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false // 停止輪詢
        }
        return 3000 // 繼續輪詢
      },
    }
  )

  if (isLoading) return <div>載入中...</div>

  return (
    <div>
      <h3>工作狀態：{job?.status}</h3>
      <progress value={job?.progress} max={100} />
      <span>{job?.progress}%</span>
    </div>
  )
}
```

---

## 實戰範例

### 完整的 CRUD 範例：客戶管理

```typescript
// hooks/useCustomers.ts
'use client'

import { useList, useDetail, useCreate, useUpdate, useDelete } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import type { Customer } from '@/types/extended.types'

export interface CreateCustomerData {
  name: { zh: string; en: string }
  email: string
  phone?: string
  address?: { zh: string; en: string }
}

export type UpdateCustomerData = Partial<CreateCustomerData>

export function useCustomers() {
  return useList<Customer>('/customers', queryKeys.customers.lists())
}

export function useCustomer(id: string) {
  return useDetail<Customer>(`/customers/${id}`, queryKeys.customers.detail(id))
}

export function useCreateCustomer() {
  return useCreate<Customer, CreateCustomerData>('/customers', {
    invalidateKeys: [queryKeys.customers.all],
    onSuccessMessage: '客戶建立成功',
    onErrorMessage: '建立客戶失敗',
  })
}

export function useUpdateCustomer() {
  return useUpdate<Customer, UpdateCustomerData>(
    (id) => `/customers/${id}`,
    {
      invalidateKeys: (data) => [
        queryKeys.customers.all,
        queryKeys.customers.detail(data.id),
      ],
      onSuccessMessage: '客戶更新成功',
    }
  )
}

export function useDeleteCustomer() {
  return useDelete((id) => `/customers/${id}`, {
    invalidateKeys: [queryKeys.customers.all],
    onSuccessMessage: '客戶已刪除',
  })
}
```

```typescript
// components/CustomerManagement.tsx
'use client'

import { useCustomers, useCreateCustomer, useDeleteCustomer } from '@/hooks/useCustomers'
import { useState } from 'react'

export function CustomerManagement() {
  const [showForm, setShowForm] = useState(false)

  const { data: customers, isLoading, error } = useCustomers()
  const createCustomer = useCreateCustomer()
  const deleteCustomer = useDeleteCustomer()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>客戶管理</h1>
        <button onClick={() => setShowForm(true)}>
          新增客戶
        </button>
      </div>

      <div className="grid gap-4">
        {customers?.map(customer => (
          <div key={customer.id} className="border p-4 rounded">
            <h3>{customer.name.zh}</h3>
            <p>Email: {customer.email}</p>
            <p>電話: {customer.phone}</p>

            <div className="mt-2 flex gap-2">
              <Link href={`/customers/${customer.id}`}>
                查看詳情
              </Link>
              <Link href={`/customers/${customer.id}/edit`}>
                編輯
              </Link>
              <button
                onClick={async () => {
                  if (confirm('確定要刪除此客戶嗎？')) {
                    await deleteCustomer.mutateAsync(customer.id)
                  }
                }}
                disabled={deleteCustomer.isPending}
              >
                刪除
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <CreateCustomerForm
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
```

---

## 最佳實踐

### 1. Query Key 管理

✅ **推薦**：使用集中式的 query key 工廠

```typescript
import { queryKeys } from '@/lib/api/queryClient'

// ✅ 好
useApi('/customers', queryKeys.customers.lists())
useApi(`/customers/${id}`, queryKeys.customers.detail(id))

// ❌ 不好
useApi('/customers', ['customers'])
useApi(`/customers/${id}`, ['customers', id])
```

### 2. 錯誤處理

✅ **推薦**：使用配置中的錯誤處理

```typescript
// ✅ 好
const create = useCreate('/customers', {
  onErrorMessage: (error) => `建立失敗：${error.message}`,
})

// ❌ 不好
const create = useCreate('/customers')
try {
  await create.mutateAsync(data)
} catch (error) {
  alert(error.message) // 手動處理錯誤
}
```

### 3. 快取失效

✅ **推薦**：在 mutation 中自動失效相關快取

```typescript
// ✅ 好
const update = useUpdate((id) => `/customers/${id}`, {
  invalidateKeys: (data) => [
    queryKeys.customers.all,        // 失效列表
    queryKeys.customers.detail(data.id), // 失效詳情
  ],
})

// ❌ 不好
const update = useUpdate((id) => `/customers/${id}`)
// 手動失效快取
queryClient.invalidateQueries({ queryKey: ['customers'] })
```

### 4. Loading 狀態

✅ **推薦**：使用 hook 提供的狀態

```typescript
// ✅ 好
function Component() {
  const { data, isLoading, isError, error } = useCustomers()

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorMessage error={error} />

  return <CustomerList customers={data} />
}

// ❌ 不好
function Component() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    fetchCustomers().then(data => {
      setCustomers(data)
      setLoading(false)
    })
  }, [])
}
```

### 5. 型別安全

✅ **推薦**：明確指定型別

```typescript
// ✅ 好
const { data } = useApi<Customer[]>('/customers', queryKeys.customers.lists())
const create = useCreate<Customer, CreateCustomerData>('/customers')

// ❌ 不好
const { data } = useApi('/customers', queryKeys.customers.lists())
const create = useCreate('/customers')
```

---

**維護者**: Claude
**最後更新**: 2025-10-24
