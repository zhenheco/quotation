# 前端整合快速指南

> 專注於前端開發者需要知道的 API 使用方式

**適用版本**: v0.1.0 (Alpha)
**建立日期**: 2025-10-24

---

## 目錄

1. [快速開始](#快速開始)
2. [核心概念](#核心概念)
3. [API 快速索引](#api-快速索引)
4. [實用程式碼範例](#實用程式碼範例)
5. [常見問題](#常見問題)

---

## 快速開始

### 1. 基礎設定

#### 安裝依賴
```bash
npm install @tanstack/react-query zod react-hook-form
```

#### 配置 Query Client
```typescript
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 分鐘
        cacheTime: 10 * 60 * 1000,     // 10 分鐘
        refetchOnWindowFocus: false,
        retry: 3,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 2. API 客戶端

```typescript
// lib/api/client.ts
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '發生錯誤')
  }

  return await response.json()
}
```

---

## 核心概念

### 認證狀態

系統使用 Supabase Auth，認證狀態自動管理：

```typescript
// 在 Server Component 中
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  redirect('/login')
}

// 在 Client Component 中
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const [user, setUser] = useState(null)
const supabase = createClient()

useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user)
  })
}, [])
```

### 資料流模式

**推薦做法**: 優先使用 Server Components

```typescript
// ✅ 推薦：Server Component
export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const customers = await getCustomers(user.id)

  return <CustomerList customers={customers} />
}

// ✅ 需要互動時使用 Client Component + API
'use client'
export function CustomerList({ customers }: { customers: Customer[] }) {
  const deleteCustomer = useDeleteCustomer()

  return (
    // ... UI
  )
}
```

---

## API 快速索引

### 客戶 (Customers)

```typescript
// 取得所有客戶
GET /api/customers
→ Customer[]

// 取得單一客戶
GET /api/customers/{id}
→ Customer

// 建立客戶
POST /api/customers
Body: {
  name: { zh: string, en: string },  // 必填
  email: string,                      // 必填
  phone?: string,
  address?: { zh: string, en: string },
  tax_id?: string,
  contact_person?: { zh: string, en: string }
}
→ Customer

// 更新客戶
PUT /api/customers/{id}
Body: Partial<Customer>
→ Customer

// 刪除客戶
DELETE /api/customers/{id}
→ { message: string }
```

### 產品 (Products)

```typescript
// 取得所有產品
GET /api/products
→ Product[]

// 建立產品
POST /api/products
Body: {
  name: { zh: string, en: string },  // 必填
  unit_price: number,                 // 必填
  currency: string,                   // 必填
  description?: { zh: string, en: string },
  category?: string,
  cost_price?: number                 // 需要權限
}
→ Product

// 更新產品
PUT /api/products/{id}
→ Product

// 刪除產品
DELETE /api/products/{id}
→ { message: string }
```

### 報價單 (Quotations)

```typescript
// 取得所有報價單
GET /api/quotations
→ Quotation[]

// 建立報價單
POST /api/quotations
Body: {
  customer_id: string,               // 必填
  issue_date: string,                // 必填
  valid_until: string,               // 必填
  currency: string,                  // 必填
  subtotal: number,                  // 必填
  tax_rate: number,
  tax_amount: number,
  total_amount: number,              // 必填
  notes?: string,
  items: Array<{                     // 必填
    product_id?: string,
    quantity: number,
    unit_price: number,
    discount: number,
    subtotal: number
  }>
}
→ Quotation

// 更新報價單
PUT /api/quotations/{id}
→ Quotation

// 刪除報價單
DELETE /api/quotations/{id}
→ { message: string }

// 匯出 PDF
GET /api/quotations/{id}/pdf?locale=zh
→ Blob (PDF file)

// 批次匯出
POST /api/quotations/batch/export
Body: { ids: string[], locale: 'zh' | 'en' }
→ Blob (ZIP file)

// 批次刪除
POST /api/quotations/batch/delete
Body: { ids: string[] }
→ { deleted: number }

// 批次更新狀態
POST /api/quotations/batch/status
Body: { ids: string[], status: string }
→ { updated: number }
```

### 匯率 (Exchange Rates)

```typescript
// 取得匯率
GET /api/exchange-rates?base=TWD
→ {
  success: true,
  base_currency: string,
  rates: { [currency: string]: number },
  timestamp: string
}

// 手動同步
POST /api/exchange-rates/sync
→ { success: true, updated: number }
```

### 收款 (Payments)

```typescript
// 取得收款記錄
GET /api/payments?customer_id={id}&status={status}
→ Payment[]

// 記錄收款
POST /api/payments
Body: {
  customer_id: string,               // 必填
  quotation_id?: string,
  contract_id?: string,
  payment_type: PaymentType,         // 必填
  payment_date: string,              // 必填
  amount: number,                    // 必填
  currency: string,                  // 必填
  payment_method?: PaymentMethod,
  reference_number?: string,
  notes?: string
}
→ Payment

// 未收款清單 (>30天)
GET /api/payments/unpaid
→ UnpaidPaymentRecord[]

// 已收款清單
GET /api/payments/collected
→ CollectedPaymentRecord[]

// 收款提醒
GET /api/payments/reminders
→ NextCollectionReminder[]
```

### 公司設定 (Company Settings)

```typescript
// 取得設定
GET /api/company-settings
→ CompanySettings

// 更新設定
POST /api/company-settings
Body: Partial<CompanySettings>
→ CompanySettings
```

---

## 實用程式碼範例

### 1. 客戶管理

#### 取得客戶列表 (Hook)
```typescript
// hooks/useCustomers.ts
import { useQuery } from '@tanstack/react-query'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    }
  })
}

// 使用
function CustomerList() {
  const { data: customers, isLoading, error } = useCustomers()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      {customers.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  )
}
```

#### 建立客戶 (Hook)
```typescript
// hooks/useCreateCustomer.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCustomerRequest) => {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// 使用
function CreateCustomerForm() {
  const createCustomer = useCreateCustomer()

  const onSubmit = async (data: FormData) => {
    try {
      await createCustomer.mutateAsync(data)
      toast.success('客戶建立成功')
      router.push('/customers')
    } catch (error) {
      toast.error('建立失敗')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* 表單欄位 */}
    </form>
  )
}
```

#### 刪除客戶 (樂觀更新)
```typescript
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete')
    },
    // 樂觀更新：立即從 UI 移除
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] })

      const previous = queryClient.getQueryData(['customers'])

      queryClient.setQueryData(['customers'], (old: Customer[]) =>
        old.filter(c => c.id !== id)
      )

      return { previous }
    },
    onError: (err, id, context) => {
      // 還原
      queryClient.setQueryData(['customers'], context?.previous)
      toast.error('刪除失敗')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
```

### 2. 報價單管理

#### 建立報價單 (完整範例)
```typescript
// components/QuotationForm.tsx
'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const quotationSchema = z.object({
  customer_id: z.string().min(1, '請選擇客戶'),
  issue_date: z.string(),
  valid_until: z.string(),
  currency: z.string().default('TWD'),
  tax_rate: z.number().default(5),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().optional(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    discount: z.number().min(0).max(100).default(0),
  })).min(1, '至少需要一個項目'),
})

type QuotationFormData = z.infer<typeof quotationSchema>

export function QuotationForm() {
  const router = useRouter()
  const createQuotation = useCreateQuotation()

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      currency: 'TWD',
      tax_rate: 5,
      items: [{ quantity: 1, unit_price: 0, discount: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  // 計算總金額
  const items = form.watch('items')
  const taxRate = form.watch('tax_rate')

  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unit_price * (1 - item.discount / 100)
    return sum + itemTotal
  }, 0)

  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const onSubmit = async (data: QuotationFormData) => {
    const payload = {
      ...data,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      items: data.items.map((item, index) => ({
        ...item,
        subtotal: item.quantity * item.unit_price * (1 - item.discount / 100),
      })),
    }

    try {
      await createQuotation.mutateAsync(payload)
      toast.success('報價單建立成功')
      router.push('/quotations')
    } catch (error) {
      toast.error('建立失敗')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* 客戶選擇 */}
      <Select {...form.register('customer_id')}>
        {/* 選項 */}
      </Select>

      {/* 日期 */}
      <Input type="date" {...form.register('issue_date')} />
      <Input type="date" {...form.register('valid_until')} />

      {/* 項目 */}
      {fields.map((field, index) => (
        <div key={field.id}>
          <Input
            type="number"
            {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
          />
          <Input
            type="number"
            {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
          />
          <Input
            type="number"
            {...form.register(`items.${index}.discount`, { valueAsNumber: true })}
          />
          <Button onClick={() => remove(index)}>刪除</Button>
        </div>
      ))}

      <Button
        type="button"
        onClick={() => append({ quantity: 1, unit_price: 0, discount: 0 })}
      >
        新增項目
      </Button>

      {/* 總計 */}
      <div>
        <p>小計: {subtotal.toFixed(2)}</p>
        <p>稅額: {taxAmount.toFixed(2)}</p>
        <p>總計: {total.toFixed(2)}</p>
      </div>

      <Button type="submit" disabled={createQuotation.isPending}>
        {createQuotation.isPending ? '建立中...' : '建立報價單'}
      </Button>
    </form>
  )
}
```

#### PDF 匯出
```typescript
export function useExportQuotationPDF(id: string) {
  return useMutation({
    mutationFn: async (locale: 'zh' | 'en') => {
      const response = await fetch(`/api/quotations/${id}/pdf?locale=${locale}`)
      if (!response.ok) throw new Error('Failed to export')
      return await response.blob()
    },
    onSuccess: (blob, locale) => {
      // 下載檔案
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${id}-${locale}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('PDF 下載成功')
    },
  })
}

// 使用
function QuotationDetail({ quotation }) {
  const exportPDF = useExportQuotationPDF(quotation.id)

  return (
    <div>
      <Button onClick={() => exportPDF.mutate('zh')}>
        匯出中文 PDF
      </Button>
      <Button onClick={() => exportPDF.mutate('en')}>
        匯出英文 PDF
      </Button>
    </div>
  )
}
```

#### 批次操作
```typescript
export function useBatchDeleteQuotations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch('/api/quotations/batch/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!response.ok) throw new Error('Failed to delete')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success(`已刪除 ${data.deleted} 個報價單`)
    },
  })
}

// 使用
function QuotationList({ quotations }) {
  const [selected, setSelected] = useState<string[]>([])
  const batchDelete = useBatchDeleteQuotations()

  const handleBatchDelete = async () => {
    if (selected.length === 0) return

    const confirmed = confirm(`確定要刪除 ${selected.length} 個報價單？`)
    if (!confirmed) return

    try {
      await batchDelete.mutateAsync(selected)
      setSelected([])
    } catch (error) {
      toast.error('批次刪除失敗')
    }
  }

  return (
    <div>
      <Button
        onClick={handleBatchDelete}
        disabled={selected.length === 0 || batchDelete.isPending}
      >
        刪除選取 ({selected.length})
      </Button>

      {quotations.map(q => (
        <div key={q.id}>
          <Checkbox
            checked={selected.includes(q.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelected([...selected, q.id])
              } else {
                setSelected(selected.filter(id => id !== q.id))
              }
            }}
          />
          {/* 其他內容 */}
        </div>
      ))}
    </div>
  )
}
```

### 3. 匯率整合

```typescript
export function useExchangeRates(baseCurrency: string = 'TWD') {
  return useQuery({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: async () => {
      const response = await fetch(`/api/exchange-rates?base=${baseCurrency}`)
      if (!response.ok) throw new Error('Failed to fetch rates')
      return response.json()
    },
    staleTime: 60 * 60 * 1000, // 1 小時
  })
}

// 貨幣轉換工具
export function useCurrencyConverter() {
  const { data: rates } = useExchangeRates('TWD')

  const convert = (amount: number, from: string, to: string) => {
    if (!rates) return amount

    if (from === 'TWD') {
      return amount * (rates.rates[to] || 1)
    }

    if (to === 'TWD') {
      return amount / (rates.rates[from] || 1)
    }

    // TWD → from → to
    const toTWD = amount / (rates.rates[from] || 1)
    return toTWD * (rates.rates[to] || 1)
  }

  return { convert, rates }
}

// 使用
function PriceDisplay({ amount, currency }: { amount: number, currency: string }) {
  const { convert } = useCurrencyConverter()
  const [displayCurrency, setDisplayCurrency] = useState('TWD')

  const displayAmount = convert(amount, currency, displayCurrency)

  return (
    <div>
      <select
        value={displayCurrency}
        onChange={(e) => setDisplayCurrency(e.target.value)}
      >
        <option value="TWD">TWD</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </select>

      <p>{displayAmount.toFixed(2)} {displayCurrency}</p>
      <p className="text-sm text-gray-500">
        原價: {amount} {currency}
      </p>
    </div>
  )
}
```

### 4. 權限檢查

```typescript
// hooks/usePermissions.ts
import { useQuery } from '@tanstack/react-query'

export function usePermissions() {
  return useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const response = await fetch('/api/user/permissions')
      if (!response.ok) throw new Error('Failed to fetch permissions')
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 分鐘
  })
}

export function useHasPermission(resource: string, action: string) {
  const { data: permissions } = usePermissions()

  if (!permissions) return false

  const permissionName = `${resource}:${action}`
  return permissions.permissions.has(permissionName)
}

// 使用
function ProductCard({ product }) {
  const canEdit = useHasPermission('products', 'write')
  const canDelete = useHasPermission('products', 'delete')
  const canSeeCost = useHasPermission('products', 'read_cost')

  return (
    <div>
      <h3>{product.name.zh}</h3>
      <p>售價: {product.unit_price}</p>

      {canSeeCost && (
        <p>成本: {product.cost_price}</p>
      )}

      {canEdit && (
        <Button onClick={() => router.push(`/products/${product.id}/edit`)}>
          編輯
        </Button>
      )}

      {canDelete && (
        <Button onClick={() => handleDelete(product.id)}>
          刪除
        </Button>
      )}
    </div>
  )
}
```

### 5. 表單驗證

```typescript
// lib/validations/customer.ts
import { z } from 'zod'

export const customerSchema = z.object({
  name: z.object({
    zh: z.string().min(1, '請輸入中文名稱').max(100),
    en: z.string().min(1, '請輸入英文名稱').max(100),
  }),
  email: z.string().email('Email 格式不正確'),
  phone: z.string()
    .regex(/^[0-9-+() ]+$/, '電話號碼格式不正確')
    .optional()
    .or(z.literal('')),
  address: z.object({
    zh: z.string().max(200).optional(),
    en: z.string().max(200).optional(),
  }).optional(),
  tax_id: z.string()
    .regex(/^[0-9]{8}$/, '統編必須為 8 碼數字')
    .optional()
    .or(z.literal('')),
  contact_person: z.object({
    zh: z.string().max(50).optional(),
    en: z.string().max(50).optional(),
  }).optional(),
})

export type CustomerFormData = z.infer<typeof customerSchema>

// 使用
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

function CustomerForm() {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  })

  // 自動顯示驗證錯誤
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('email')} />
      {form.formState.errors.email && (
        <p className="text-red-500">{form.formState.errors.email.message}</p>
      )}
    </form>
  )
}
```

---

## 常見問題

### Q1: 如何處理認證失敗？

```typescript
// 統一錯誤處理
export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${endpoint}`, options)

  if (response.status === 401) {
    // 認證失敗，導向登入頁
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
}
```

### Q2: 如何實作搜尋功能？

目前 API 沒有內建搜尋，建議前端實作：

```typescript
function CustomerList() {
  const { data: customers } = useCustomers()
  const [search, setSearch] = useState('')

  const filtered = customers?.filter(c =>
    c.name.zh.includes(search) ||
    c.name.en.includes(search) ||
    c.email.includes(search)
  )

  return (
    <div>
      <Input
        type="search"
        placeholder="搜尋客戶..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered?.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  )
}
```

### Q3: 如何處理大量資料？

目前沒有分頁，建議使用虛擬列表：

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualCustomerList({ customers }: { customers: Customer[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // 每個項目高度
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <CustomerCard customer={customers[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Q4: 如何實作離線支援？

使用 Service Worker 和 IndexedDB：

```typescript
// 啟用 PWA
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  // ... 其他配置
})

// 快取查詢資料
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000, // 24 小時
})
```

### Q5: 如何實作樂觀更新？

參考「刪除客戶」範例，關鍵步驟：

1. `onMutate`: 取消進行中的查詢，備份舊資料，更新快取
2. `onError`: 還原舊資料
3. `onSettled`: 重新取得最新資料

### Q6: 雙語欄位如何處理？

```typescript
// 工具函數
function getBilingualText(
  text: { zh: string; en: string } | undefined,
  locale: 'zh' | 'en'
): string {
  if (!text) return ''
  return text[locale] || text.zh || text.en || ''
}

// 使用
function CustomerName({ customer, locale }: { customer: Customer, locale: 'zh' | 'en' }) {
  return <span>{getBilingualText(customer.name, locale)}</span>
}

// 或使用 next-intl
import { useLocale } from 'next-intl'

function CustomerName({ customer }: { customer: Customer }) {
  const locale = useLocale() as 'zh' | 'en'
  return <span>{customer.name[locale]}</span>
}
```

### Q7: 如何處理檔案上傳？

```typescript
async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) throw new Error('Upload failed')

  const data = await response.json()
  return data.url // 回傳檔案 URL
}

// 使用
function LogoUpload() {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 驗證檔案
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('只支援 JPG 和 PNG 格式')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('檔案大小不能超過 5MB')
      return
    }

    try {
      setUploading(true)
      const url = await uploadFile(file)

      // 更新設定
      await updateCompanySettings({ logo_url: url })

      toast.success('Logo 上傳成功')
    } catch (error) {
      toast.error('上傳失敗')
    } finally {
      setUploading(false)
    }
  }

  return (
    <input
      type="file"
      accept="image/jpeg,image/png"
      onChange={handleUpload}
      disabled={uploading}
    />
  )
}
```

### Q8: 如何實作即時更新？

使用 Supabase Realtime：

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useRealtimeQuotations() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('quotations-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'quotations',
        },
        (payload) => {
          console.log('Quotation changed:', payload)

          // 重新取得資料
          queryClient.invalidateQueries({ queryKey: ['quotations'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, supabase])
}

// 使用
function QuotationList() {
  const { data: quotations } = useQuotations()
  useRealtimeQuotations() // 啟用即時更新

  return (
    // ... UI
  )
}
```

---

## 最佳實踐

### ✅ 推薦做法

1. **優先使用 Server Components** - 初次載入時直接從伺服器取得資料
2. **使用 React Query** - 管理客戶端資料狀態和快取
3. **型別安全** - 充分利用 TypeScript 型別定義
4. **錯誤處理** - 統一錯誤處理邏輯
5. **樂觀更新** - 提升使用者體驗
6. **快取策略** - 合理設定 staleTime 和 cacheTime
7. **表單驗證** - 使用 Zod + React Hook Form

### ❌ 避免做法

1. **不要在 Server Components 使用 useState/useEffect**
2. **不要過度請求 API** - 善用快取
3. **不要忽略錯誤處理**
4. **不要在前端儲存敏感資料**
5. **不要同步查詢可以批次查詢的資料**

---

## 相關資源

- **完整 API 文件**: `/docs/API_ARCHITECTURE.md`
- **型別定義**: `/types/*.types.ts`
- **範例程式碼**: `/app/[locale]/*`
- **React Query 文件**: https://tanstack.com/query
- **Next.js 文件**: https://nextjs.org/docs

---

**維護者**: Claude
**最後更新**: 2025-10-24
