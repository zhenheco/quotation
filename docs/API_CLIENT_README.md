# API 客戶端整合架構

> 統一的 API 整合解決方案，提供型別安全、錯誤處理和快取管理

**版本**: 1.0.0
**建立日期**: 2025-10-24

---

## 📋 目錄

1. [概覽](#概覽)
2. [核心特性](#核心特性)
3. [架構設計](#架構設計)
4. [快速開始](#快速開始)
5. [API 參考](#api-參考)
6. [進階用法](#進階用法)
7. [常見問題](#常見問題)

---

## 概覽

這是一個完整的 API 整合架構，專為 Next.js 15 + React 19 設計，提供：

- 🎯 **型別安全**：完整的 TypeScript 支援
- ⚡ **自動快取**：使用 React Query 管理資料快取
- 🔄 **樂觀更新**：即時 UI 更新體驗
- 🛡️ **錯誤處理**：統一的錯誤處理和訊息格式化
- 🔐 **CSRF 保護**：自動處理 CSRF token
- ♻️ **自動重試**：網路錯誤自動重試
- 📡 **攔截器**：請求和回應攔截器支援

---

## 核心特性

### 1. 統一的 API 客戶端

封裝所有 HTTP 請求邏輯：

```typescript
import { apiClient } from '@/lib/api/client'

// GET 請求
const customers = await apiClient.get<Customer[]>('/customers')

// POST 請求
const newCustomer = await apiClient.post<Customer>('/customers', {
  name: { zh: '客戶', en: 'Customer' },
  email: 'customer@example.com',
})

// PUT 請求
const updated = await apiClient.put<Customer>(`/customers/${id}`, data)

// DELETE 請求
await apiClient.delete(`/customers/${id}`)
```

### 2. React Query 整合

自動快取和狀態管理：

```typescript
import { useApi } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'

function CustomerList() {
  const { data, isLoading, error, refetch } = useApi<Customer[]>(
    '/customers',
    queryKeys.customers.lists()
  )

  // 資料自動快取 5 分鐘
  // 自動處理 loading 和 error 狀態
  // 支援手動 refetch
}
```

### 3. 通用 Hooks

預建的常用 hooks：

```typescript
import {
  useList,      // 取得列表
  useDetail,    // 取得詳情
  useCreate,    // 建立
  useUpdate,    // 更新
  useDelete,    // 刪除
  useBatchDelete, // 批次刪除
  useFileUpload,  // 檔案上傳
  usePolling,     // 輪詢
} from '@/lib/api/hooks'
```

### 4. 錯誤處理系統

自訂錯誤類別和友善訊息：

```typescript
import {
  ApiError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  getUserFriendlyMessage,
} from '@/lib/api/errors'

try {
  await apiClient.post('/customers', data)
} catch (error) {
  if (error instanceof ValidationError) {
    // 處理驗證錯誤
    console.log(error.details)
  } else if (error instanceof AuthenticationError) {
    // 導向登入頁
    router.push('/login')
  }

  // 顯示友善訊息
  const message = getUserFriendlyMessage(error)
  toast.error(message)
}
```

---

## 架構設計

### 檔案結構

```
lib/api/
├── client.ts           # API 客戶端
├── queryClient.ts      # React Query 配置
├── hooks.ts            # 通用 Hooks
└── errors.ts           # 錯誤處理

types/
└── api.ts              # 型別定義

app/
└── providers.tsx       # Providers 包裝器
```

### 資料流

```
User Action
    ↓
React Component
    ↓
Custom Hook (useCreate, useUpdate, etc.)
    ↓
API Client (fetch + CSRF + retry)
    ↓
Backend API
    ↓
Response / Error
    ↓
React Query (cache + invalidate)
    ↓
UI Update
```

### Query Key 架構

使用集中式的 query key 工廠：

```typescript
// lib/api/queryClient.ts
export const queryKeys = {
  customers: {
    all: ['customers'],
    lists: () => [...queryKeys.customers.all, 'list'],
    list: (filters) => [...queryKeys.customers.lists(), filters],
    details: () => [...queryKeys.customers.all, 'detail'],
    detail: (id) => [...queryKeys.customers.details(), id],
  },
  // ... 其他資源
}
```

**優勢**：
- 避免 query key 重複
- 自動型別推斷
- 階層式快取失效

---

## 快速開始

### 步驟 1：設定 Providers

```typescript
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### 步驟 2：建立自訂 Hook

```typescript
// hooks/useCustomers.ts
import { useList, useCreate, useUpdate, useDelete } from '@/lib/api/hooks'
import { queryKeys } from '@/lib/api/queryClient'
import type { Customer } from '@/types/extended.types'

export function useCustomers() {
  return useList<Customer>('/customers', queryKeys.customers.lists())
}

export function useCreateCustomer() {
  return useCreate<Customer, CreateCustomerData>('/customers', {
    invalidateKeys: [queryKeys.customers.all],
    onSuccessMessage: '客戶建立成功',
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
    }
  )
}

export function useDeleteCustomer() {
  return useDelete((id) => `/customers/${id}`, {
    invalidateKeys: [queryKeys.customers.all],
  })
}
```

### 步驟 3：在元件中使用

```typescript
// components/CustomerList.tsx
'use client'

import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers'

export function CustomerList() {
  const { data: customers, isLoading, error } = useCustomers()
  const deleteCustomer = useDeleteCustomer()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      {customers?.map(customer => (
        <div key={customer.id}>
          <h3>{customer.name.zh}</h3>
          <button
            onClick={() => deleteCustomer.mutate(customer.id)}
            disabled={deleteCustomer.isPending}
          >
            刪除
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## API 參考

### API Client

#### `apiClient.get<T>(endpoint, config?)`

發送 GET 請求。

**參數**：
- `endpoint`: API 端點
- `config?`: 請求配置（可選）

**回傳**：`Promise<T>`

**範例**：
```typescript
const customers = await apiClient.get<Customer[]>('/customers')
const customer = await apiClient.get<Customer>(`/customers/${id}`)
```

#### `apiClient.post<T>(endpoint, data, config?)`

發送 POST 請求。

**範例**：
```typescript
const customer = await apiClient.post<Customer>('/customers', {
  name: { zh: '客戶', en: 'Customer' },
  email: 'customer@example.com',
})
```

#### `apiClient.put<T>(endpoint, data, config?)`

發送 PUT 請求。

#### `apiClient.patch<T>(endpoint, data, config?)`

發送 PATCH 請求。

#### `apiClient.delete<T>(endpoint, config?)`

發送 DELETE 請求。

### Hooks

#### `useApi<T>(endpoint, queryKey, options?)`

通用資料取用 hook。

**參數**：
- `endpoint`: API 端點
- `queryKey`: Query key 陣列
- `options?`: React Query 選項

**回傳**：
```typescript
{
  data: T | null
  isLoading: boolean
  isError: boolean
  error: ApiError | null
  isSuccess: boolean
  refetch: () => void
}
```

#### `useCreate<TData, TVariables>(endpoint, config?)`

建立資源 hook。

**參數**：
- `endpoint`: API 端點
- `config?`: Mutation 配置

**回傳**：
```typescript
{
  mutate: (variables: TVariables) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  error: ApiError | null
  reset: () => void
}
```

#### `useUpdate<TData, TVariables>`

更新資源 hook。

#### `useDelete<TData>`

刪除資源 hook。

### Query Keys

```typescript
import { queryKeys } from '@/lib/api/queryClient'

// 客戶
queryKeys.customers.all           // ['customers']
queryKeys.customers.lists()       // ['customers', 'list']
queryKeys.customers.list(filters) // ['customers', 'list', filters]
queryKeys.customers.detail(id)    // ['customers', 'detail', id]

// 產品
queryKeys.products.all
queryKeys.products.lists()
queryKeys.products.detail(id)

// 報價單
queryKeys.quotations.all
queryKeys.quotations.lists()
queryKeys.quotations.detail(id)

// 合約
queryKeys.contracts.all
queryKeys.contracts.overdue()
queryKeys.contracts.paymentProgress(id)

// 付款
queryKeys.payments.all
queryKeys.payments.unpaid()
queryKeys.payments.collected()

// 使用者
queryKeys.user.profile()
queryKeys.user.permissions()
```

---

## 進階用法

### 1. 攔截器

註冊全域攔截器：

```typescript
import { registerInterceptor } from '@/lib/api/client'

// 請求攔截器：新增自訂標頭
const unregister = registerInterceptor({
  onRequest: async (config) => {
    const token = await getCustomToken()
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-Custom-Token': token,
      },
    }
  },

  onResponse: async (response) => {
    // 記錄回應
    console.log('API Response:', response)
    return response
  },

  onError: async (error) => {
    // 記錄錯誤到 Sentry
    Sentry.captureException(error)
  },
})

// 取消註冊
unregister()
```

### 2. 樂觀更新

立即更新 UI，失敗時自動回滾：

```typescript
const toggleFavorite = useMutationApi<Customer, { id: string; favorite: boolean }>(
  ({ id, favorite }) => apiClient.patch(`/customers/${id}`, { favorite }),
  {
    optimisticUpdate: {
      queryKey: queryKeys.customers.detail(customerId),
      updateFn: (old, variables) => ({
        ...old,
        favorite: variables.favorite,
      }),
    },
  }
)
```

### 3. 預取資料

在使用者操作前預先載入資料：

```typescript
import { prefetchData } from '@/lib/api/queryClient'
import { useQueryClient } from '@tanstack/react-query'

function CustomerLink({ id }) {
  const queryClient = useQueryClient()

  const handleMouseEnter = () => {
    // 滑鼠移入時預取資料
    prefetchData(
      queryClient,
      queryKeys.customers.detail(id),
      () => apiClient.get(`/customers/${id}`)
    )
  }

  return (
    <Link
      href={`/customers/${id}`}
      onMouseEnter={handleMouseEnter}
    >
      查看詳情
    </Link>
  )
}
```

### 4. 手動快取管理

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { setQueryData, getQueryData, removeQueryData } from '@/lib/api/queryClient'

function Component() {
  const queryClient = useQueryClient()

  // 設定快取
  setQueryData(queryClient, queryKeys.customers.detail(id), newData)

  // 取得快取
  const cached = getQueryData(queryClient, queryKeys.customers.detail(id))

  // 移除快取
  removeQueryData(queryClient, queryKeys.customers.detail(id))
}
```

---

## 常見問題

### Q1: 如何處理認證錯誤？

認證錯誤會自動觸發導向登入頁：

```typescript
// lib/api/queryClient.ts 中已配置
mutations: {
  onError: (error) => {
    if (error instanceof ApiError && error.type === 'AUTHENTICATION_ERROR') {
      window.location.href = '/login'
    }
  },
}
```

### Q2: 如何自訂快取時間？

在 hook 中指定 `staleTime`：

```typescript
useApi('/customers', queryKeys.customers.lists(), {
  staleTime: 10 * 60 * 1000, // 10 分鐘
})
```

### Q3: 如何禁用自動重試？

```typescript
useApi('/customers', queryKeys.customers.lists(), {
  retry: false,
})
```

### Q4: 如何在伺服器端使用？

API 客戶端僅適用於客戶端。在伺服器端直接使用服務層：

```typescript
// Server Component
import { getCustomers } from '@/lib/services/database'

export default async function CustomersPage() {
  const customers = await getCustomers(userId)
  return <CustomerList customers={customers} />
}
```

### Q5: 如何整合 Toast 通知？

在配置中新增 toast 回調：

```typescript
import toast from 'react-hot-toast'

const create = useCreate('/customers', {
  onSuccessMessage: '客戶建立成功',
  onSuccess: () => {
    toast.success('客戶建立成功')
  },
  onError: (error) => {
    toast.error(getUserFriendlyMessage(error))
  },
})
```

### Q6: 如何除錯？

啟用 React Query Devtools（開發環境自動啟用）：

```typescript
// app/providers.tsx
<ReactQueryDevtools initialIsOpen={false} />
```

---

## 相關文檔

- [API 整合範例](/docs/API_INTEGRATION_EXAMPLES.md)
- [前端整合指南](/docs/FRONTEND_INTEGRATION_GUIDE.md)
- [型別定義參考](/types/api.ts)
- [React Query 官方文檔](https://tanstack.com/query)

---

**維護者**: Claude
**最後更新**: 2025-10-24
