# React/Next.js 前端程式碼深度分析與優化報告

## 📊 執行摘要

本報告針對報價系統的 Next.js 15 + React 19 前端程式碼進行全面分析，識別出關鍵優化機會並提供具體的重構方案。

### 關鍵發現
- ✅ **優勢**：正確使用 Server Components、良好的國際化架構
- ⚠️ **中度問題**：QuotationForm.tsx (837 行) 需要重構、缺少共用 hooks
- 🔴 **嚴重問題**：過度使用 'use client'、缺少錯誤邊界、無 loading 狀態管理

---

## 1. 組件架構優化分析

### 1.1 過於複雜的組件

#### 🔴 **QuotationForm.tsx (837 行)**
**問題**：
- 違反單一職責原則 (SRP)
- 狀態管理過於複雜 (14 個 useState)
- 業務邏輯與 UI 混合
- 難以測試和維護

**拆分建議**：
```
QuotationForm.tsx (主組件，約 150 行)
├── useQuotationForm.ts (自訂 Hook，狀態管理)
├── useExchangeRate.ts (匯率邏輯)
├── QuotationBasicInfo.tsx (客戶、日期、幣別)
├── QuotationItemList.tsx (品項列表)
│   ├── QuotationItemRow.tsx (單一品項)
│   └── ProductSelector.tsx (產品選擇器)
├── QuotationSummary.tsx (小計、稅金、總計)
├── QuotationNotes.tsx (備註與模版)
└── constants/
    ├── noteTemplates.ts
    └── currencies.ts
```

#### ⚠️ **QuotationEditForm.tsx (593 行)**
- 與 QuotationForm.tsx 有大量重複程式碼
- 建議：提取共用邏輯到 hooks，使用組合模式

#### ⚠️ **QuotationList.tsx (493 行)**
- 混合了列表渲染、過濾、排序邏輯
- 建議：拆分為 QuotationListView、QuotationFilters、QuotationListItem

### 1.2 Server Components vs Client Components 使用分析

#### ✅ **正確使用 Server Components**
```typescript
// ✅ app/[locale]/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = await createClient()
  // 在伺服器端獲取資料
  const [revenueData, currencyData, statusData, summary] = await Promise.all([
    getRevenueTrend(6),
    getCurrencyDistribution(),
    getStatusStatistics(),
    getDashboardSummary()
  ])

  return <DashboardCharts ... />
}
```

#### 🔴 **過度使用 'use client'**
許多組件不需要客戶端渲染：

```typescript
// ❌ 不需要 'use client'
// components/ui/PageHeader.tsx
'use client' // 這個組件沒有互動性，應該是 Server Component

interface PageHeaderProps {
  title: string
  description?: string
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  )
}
```

**建議修正**：
```typescript
// ✅ 移除 'use client'，讓它成為 Server Component
interface PageHeaderProps {
  title: string
  description?: string
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
    </div>
  )
}
```

### 1.3 組件職責清晰度評估

#### ⚠️ **職責不明確的組件**

**DashboardCharts.tsx**：
- 混合了數據格式化、UI 渲染、狀態管理
- 建議：提取 `useDashboardData` hook

**Sidebar.tsx**：
- 硬編碼的選單項目
- 建議：從設定檔載入，支援權限控制

---

## 2. React 19 最佳實踐分析

### 2.1 新特性使用狀況

#### ❌ **未使用的 React 19 特性**

目前專案**未充分利用** React 19 的新特性：

1. **`use()` Hook**：可簡化非同步資料處理
2. **Server Actions**：可取代部分 API Routes
3. **`useOptimistic()`**：提升 UI 互動體驗
4. **`useFormStatus()` & `useFormState()`**：改善表單處理

#### 🔄 **建議使用 Server Actions 重構**

**重構前** (目前做法)：
```typescript
// app/[locale]/quotations/QuotationForm.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsSubmitting(true)

  try {
    const response = await fetch('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotationData),
    })

    if (!response.ok) {
      throw new Error('Failed to save')
    }

    router.push(`/${locale}/quotations`)
  } catch (err) {
    setError(err.message)
  } finally {
    setIsSubmitting(false)
  }
}
```

**重構後** (使用 Server Actions)：
```typescript
// app/actions/quotations.ts (新檔案)
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createQuotation(formData: FormData) {
  const supabase = await createClient()

  const quotationData = {
    customer_id: formData.get('customerId'),
    // ... 其他欄位
  }

  const { data, error } = await supabase
    .from('quotations')
    .insert([quotationData])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/[locale]/quotations', 'page')
  redirect(`/quotations/${data.id}`)
}

// app/[locale]/quotations/new/page.tsx
import { createQuotation } from '@/app/actions/quotations'
import QuotationForm from './QuotationForm'

export default function NewQuotationPage() {
  return <QuotationForm action={createQuotation} />
}

// QuotationForm.tsx (簡化版)
'use client'

import { useFormState, useFormStatus } from 'react'

export default function QuotationForm({ action }) {
  const [state, formAction] = useFormState(action, null)

  return (
    <form action={formAction}>
      {/* 表單欄位 */}
      <SubmitButton />
      {state?.error && <ErrorMessage error={state.error} />}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? '儲存中...' : '儲存'}
    </button>
  )
}
```

#### 🎯 **使用 `useOptimistic()` 提升體驗**

```typescript
// app/[locale]/quotations/QuotationList.tsx
'use client'

import { useOptimistic } from 'react'

export default function QuotationList({ quotations }) {
  const [optimisticQuotations, addOptimisticQuotation] = useOptimistic(
    quotations,
    (state, newQuotation) => [...state, { ...newQuotation, sending: true }]
  )

  async function createQuotation(formData) {
    // 立即顯示樂觀更新
    addOptimisticQuotation({
      id: crypto.randomUUID(),
      ...Object.fromEntries(formData)
    })

    // 實際送出請求
    await createQuotationAction(formData)
  }

  return (
    <div>
      {optimisticQuotations.map(quotation => (
        <QuotationCard
          key={quotation.id}
          quotation={quotation}
          isPending={quotation.sending}
        />
      ))}
    </div>
  )
}
```

### 2.2 Hooks 使用評估

#### ⚠️ **缺少自訂 Hooks**

目前只有 3 個自訂 hooks：
- `usePermission.ts`
- `usePayments.ts`
- `useAdminCompanies.ts`

**建議新增的共用 Hooks**：

```typescript
// hooks/useQuotationForm.ts
import { useState, useCallback } from 'react'

export function useQuotationForm(initialData?) {
  const [formData, setFormData] = useState(initialData || {
    customerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'TWD',
    taxRate: '5',
    notes: '',
  })

  const [items, setItems] = useState([])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
      subtotal: 0,
    }])
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateItem = useCallback((index: number, field: string, value: any) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }

      // 重新計算小計
      const quantity = parseFloat(newItems[index].quantity) || 0
      const unitPrice = parseFloat(newItems[index].unit_price) || 0
      const discount = parseFloat(newItems[index].discount) || 0
      newItems[index].subtotal = (quantity * unitPrice) + discount

      return newItems
    })
  }, [])

  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const taxRate = parseFloat(formData.taxRate) || 0
    const taxAmount = (subtotal * taxRate) / 100
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }, [items, formData.taxRate])

  return {
    formData,
    setFormData,
    items,
    addItem,
    removeItem,
    updateItem,
    calculateTotals,
  }
}

// hooks/useExchangeRate.ts
import { useState, useEffect } from 'react'

export function useExchangeRate(baseCurrency: string) {
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/exchange-rates?base=${baseCurrency}`)
        const data = await response.json()

        if (data.success) {
          setRates(data.rates)
          setError(null)
        } else {
          setError(data.error || 'Failed to fetch rates')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRates()
  }, [baseCurrency])

  const convertPrice = useCallback((
    price: number,
    fromCurrency: string,
    toCurrency: string
  ) => {
    if (fromCurrency === toCurrency) return price

    const rate = rates[fromCurrency]
    if (!rate || rate === 0) {
      console.warn(`No exchange rate for ${fromCurrency}`)
      return price
    }

    return price / rate
  }, [rates])

  return { rates, loading, error, convertPrice }
}

// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue] as const
}
```

### 2.3 狀態管理評估

#### ⚠️ **過度使用 useState**

**QuotationForm.tsx** 中有 14 個獨立的 useState：
```typescript
// ❌ 狀態管理過於分散
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState('')
const [exchangeRates, setExchangeRates] = useState({})
const [customerQuery, setCustomerQuery] = useState('')
const [selectedCustomer, setSelectedCustomer] = useState(null)
const [productQueries, setProductQueries] = useState({})
const [selectedProducts, setSelectedProducts] = useState({})
const [showSaveTemplate, setShowSaveTemplate] = useState(false)
const [customTemplates, setCustomTemplates] = useState({})
const [selectedTemplate, setSelectedTemplate] = useState('')
const [customExchangeRate, setCustomExchangeRate] = useState('')
const [formData, setFormData] = useState({...})
const [items, setItems] = useState([])
```

**建議使用 `useReducer`**：
```typescript
// ✅ 使用 useReducer 統一管理
type QuotationState = {
  formData: FormData
  items: QuotationItem[]
  ui: {
    isSubmitting: boolean
    error: string | null
    showSaveTemplate: boolean
    selectedTemplate: string
  }
  search: {
    customerQuery: string
    selectedCustomer: Customer | null
    productQueries: Record<number, string>
    selectedProducts: Record<number, Product | null>
  }
  exchangeRates: {
    rates: Record<string, number>
    customRate: string
  }
  templates: Record<string, string>
}

type QuotationAction =
  | { type: 'SET_FORM_DATA'; payload: Partial<FormData> }
  | { type: 'ADD_ITEM' }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_ITEM'; payload: { index: number; field: string; value: any } }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  // ... 其他 actions

function quotationReducer(state: QuotationState, action: QuotationAction): QuotationState {
  switch (action.type) {
    case 'SET_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.payload } }
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, {
          product_id: '',
          quantity: 1,
          unit_price: 0,
          discount: 0,
          subtotal: 0,
        }]
      }
    // ... 其他 cases
    default:
      return state
  }
}

// 使用
const [state, dispatch] = useReducer(quotationReducer, initialState)
```

---

## 3. Next.js 15 優化機會

### 3.1 App Router 使用評估

#### ✅ **良好的檔案結構**
```
app/
├── [locale]/              # 國際化路由
│   ├── layout.tsx         # 語系佈局
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── quotations/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/
│   │           └── page.tsx
```

#### ⚠️ **缺少 Loading 和 Error 處理**

**建議新增**：
```typescript
// app/[locale]/quotations/loading.tsx
export default function QuotationsLoading() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// app/[locale]/quotations/error.tsx
'use client'

export default function QuotationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        發生錯誤
      </h2>
      <p className="text-gray-600 mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        重試
      </button>
    </div>
  )
}

// app/[locale]/quotations/not-found.tsx
export default function QuotationNotFound() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        找不到報價單
      </h2>
      <a href="/quotations" className="text-indigo-600 hover:underline">
        返回列表
      </a>
    </div>
  )
}
```

### 3.2 路由分組與佈局優化

#### 建議新增 Route Groups

```
app/
├── [locale]/
│   ├── (dashboard)/           # 需要驗證的頁面
│   │   ├── layout.tsx         # 共用驗證邏輯
│   │   ├── dashboard/
│   │   ├── quotations/
│   │   ├── customers/
│   │   └── products/
│   ├── (auth)/                # 認證頁面
│   │   ├── layout.tsx         # 簡化佈局
│   │   └── login/
│   └── (public)/              # 公開頁面
│       └── about/
```

**優勢**：
- 不同區域使用不同佈局
- 更清晰的職責劃分
- 更好的程式碼組織

### 3.3 Server Actions 使用建議

#### 目前狀況
- ❌ 完全依賴 API Routes
- ❌ 需要手動處理 loading、error 狀態
- ❌ 客戶端 JavaScript bundle 較大

#### 建議遷移到 Server Actions

**新增 Actions 目錄結構**：
```
app/
└── actions/
    ├── quotations.ts
    ├── customers.ts
    ├── products.ts
    └── analytics.ts
```

**範例：quotations.ts**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const QuotationSchema = z.object({
  customer_id: z.string().uuid(),
  issue_date: z.string(),
  valid_until: z.string(),
  currency: z.enum(['TWD', 'USD', 'EUR', 'JPY', 'CNY']),
  tax_rate: z.number().min(0).max(100),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().positive(),
    unit_price: z.number().nonnegative(),
    discount: z.number(),
  })).min(1),
})

export async function createQuotation(prevState: any, formData: FormData) {
  const supabase = await createClient()

  // 驗證資料
  const validatedFields = QuotationSchema.safeParse({
    customer_id: formData.get('customerId'),
    issue_date: formData.get('issueDate'),
    valid_until: formData.get('validUntil'),
    currency: formData.get('currency'),
    tax_rate: parseFloat(formData.get('taxRate') as string),
    notes: formData.get('notes'),
    items: JSON.parse(formData.get('items') as string),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: '驗證失敗',
    }
  }

  // 計算總計
  const { items, tax_rate } = validatedFields.data
  const subtotal = items.reduce((sum, item) =>
    sum + (item.quantity * item.unit_price + item.discount), 0
  )
  const tax_amount = (subtotal * tax_rate) / 100
  const total_amount = subtotal + tax_amount

  // 儲存到資料庫
  const { data, error } = await supabase
    .from('quotations')
    .insert([{
      ...validatedFields.data,
      subtotal,
      tax_amount,
      total_amount,
      status: 'draft',
    }])
    .select()
    .single()

  if (error) {
    return {
      message: '儲存失敗：' + error.message,
    }
  }

  // 儲存品項
  const itemsData = items.map(item => ({
    quotation_id: data.id,
    ...item,
    subtotal: item.quantity * item.unit_price + item.discount,
  }))

  const { error: itemsError } = await supabase
    .from('quotation_items')
    .insert(itemsData)

  if (itemsError) {
    // 回滾：刪除報價單
    await supabase.from('quotations').delete().eq('id', data.id)
    return {
      message: '儲存品項失敗：' + itemsError.message,
    }
  }

  // 重新驗證快取
  revalidatePath('/[locale]/quotations', 'page')
  revalidatePath('/[locale]/dashboard', 'page')

  // 導向詳情頁
  redirect(`/quotations/${data.id}`)
}

export async function updateQuotation(
  quotationId: string,
  prevState: any,
  formData: FormData
) {
  // 類似實作...
}

export async function deleteQuotation(quotationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quotations')
    .delete()
    .eq('id', quotationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/[locale]/quotations', 'page')
  return { success: true }
}
```

### 3.4 不必要的客戶端渲染

#### 可優化為 Server Components 的組件

```typescript
// ❌ 目前：完全客戶端渲染
// app/[locale]/quotations/page.tsx
'use client'

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([])

  useEffect(() => {
    fetch('/api/quotations')
      .then(res => res.json())
      .then(data => setQuotations(data))
  }, [])

  return <QuotationList quotations={quotations} />
}

// ✅ 建議：Server Component + Client Component
// app/[locale]/quotations/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'
import QuotationList from './QuotationList'

export default async function QuotationsPage() {
  const supabase = await createClient()

  const { data: quotations } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(*),
      items:quotation_items(*)
    `)
    .order('created_at', { ascending: false })

  return <QuotationList quotations={quotations} />
}

// QuotationList.tsx (Client Component - 只有互動部分)
'use client'

export default function QuotationList({ quotations }) {
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')

  const filteredQuotations = useMemo(() => {
    return quotations
      .filter(q => filter === 'all' || q.status === filter)
      .sort((a, b) => /* 排序邏輯 */)
  }, [quotations, filter, sortBy])

  return (
    <div>
      <QuotationFilters filter={filter} setFilter={setFilter} />
      {filteredQuotations.map(q => <QuotationCard key={q.id} quotation={q} />)}
    </div>
  )
}
```

---

## 4. 性能優化機會

### 4.1 Bundle Size 優化

#### 📊 **當前問題**
- Headless UI 完整引入
- Recharts 圖表庫較大
- 缺少程式碼分割

#### 🎯 **優化建議**

**1. 動態引入重型組件**
```typescript
// ❌ 直接引入
import DashboardCharts from '@/components/DashboardCharts'

// ✅ 動態引入
import dynamic from 'next/dynamic'

const DashboardCharts = dynamic(
  () => import('@/components/DashboardCharts'),
  {
    loading: () => <ChartsLoadingSkeleton />,
    ssr: false, // 如果圖表不需要 SSR
  }
)
```

**2. 按需引入 Headless UI**
```typescript
// ❌ 引入整個 Combobox
import { Combobox } from '@headlessui/react'

// ✅ 只引入需要的部分 (Headless UI 已經是 tree-shakeable)
// 但可以考慮自己實作簡單的 Combobox 以減少依賴
```

**3. 圖表庫優化**
```typescript
// 考慮使用更輕量的替代方案
// - Chart.js (更輕量)
// - Victory (組件化更好)
// - 或自己用 SVG 實作簡單圖表

// 或使用動態引入
const RevenueChart = dynamic(() => import('@/components/charts/RevenueChart'), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
  ssr: false,
})
```

### 4.2 Lazy Loading 機會

#### 建議實作延遲載入的組件

```typescript
// app/[locale]/quotations/[id]/page.tsx
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// PDF 下載按鈕只在需要時載入
const PDFDownloadButton = dynamic(
  () => import('@/components/PDFDownloadButton'),
  { loading: () => <ButtonSkeleton /> }
)

// 圖表在下方，使用 Suspense 延遲載入
export default async function QuotationDetailPage({ params }) {
  const quotation = await getQuotation(params.id)

  return (
    <div>
      <QuotationHeader quotation={quotation} />
      <QuotationItems items={quotation.items} />

      <Suspense fallback={<div>載入 PDF 功能...</div>}>
        <PDFDownloadButton quotation={quotation} />
      </Suspense>

      <Suspense fallback={<div>載入分析圖表...</div>}>
        <QuotationAnalytics quotationId={quotation.id} />
      </Suspense>
    </div>
  )
}
```

### 4.3 圖片優化

#### 使用 Next.js Image 組件

```typescript
// ❌ 目前可能的做法
<img src="/logo.png" alt="Logo" />

// ✅ 使用 next/image
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // 如果是 LCP 元素
  placeholder="blur" // 需要提供 blurDataURL
/>

// 如果是外部圖片
<Image
  src="https://example.com/avatar.jpg"
  alt="User Avatar"
  width={40}
  height={40}
  unoptimized // 或在 next.config.ts 設定 domains
/>
```

### 4.4 避免不必要的重渲染

#### 使用 React.memo 和 useMemo

```typescript
// QuotationList.tsx
import { memo } from 'react'

// ✅ 記憶化列表項目
const QuotationCard = memo(function QuotationCard({ quotation }) {
  return (
    <div className="border rounded-lg p-4">
      {/* 卡片內容 */}
    </div>
  )
}, (prevProps, nextProps) => {
  // 只在 quotation.id 變更時重渲染
  return prevProps.quotation.id === nextProps.quotation.id &&
         prevProps.quotation.updated_at === nextProps.quotation.updated_at
})

// ✅ 記憶化昂貴的計算
function QuotationSummary({ items, taxRate }) {
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const taxAmount = (subtotal * taxRate) / 100
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }, [items, taxRate])

  return (
    <div>
      <div>小計：{totals.subtotal}</div>
      <div>稅金：{totals.taxAmount}</div>
      <div>總計：{totals.total}</div>
    </div>
  )
}

// ✅ 記憶化回呼函數
function QuotationForm() {
  const [items, setItems] = useState([])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, createNewItem()])
  }, [])

  const updateItem = useCallback((index, field, value) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }, [])

  return (
    <ItemList
      items={items}
      onAddItem={addItem}
      onUpdateItem={updateItem}
    />
  )
}
```

---

## 5. 代碼品質改進

### 5.1 組件可重用性

#### 建議建立的共用組件庫

```typescript
// components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500',
        ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button

// components/ui/Select.tsx
interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
}

export default function Select({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  error
}: SelectProps) {
  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

// components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, className = '', onClick, hoverable }: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow ${
        hoverable ? 'hover:shadow-md transition-shadow' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 ${className}`}>
      {children}
    </div>
  )
}
```

### 5.2 TypeScript 類型定義優化

#### 建立集中的類型定義

```typescript
// types/quotation.ts
export interface Quotation {
  id: string
  customer_id: string
  issue_date: string
  valid_until: string
  currency: Currency
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  status: QuotationStatus
  notes: string | null
  created_at: string
  updated_at: string

  // 關聯
  customer?: Customer
  items?: QuotationItem[]
}

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number

  // 關聯
  product?: Product
}

export type Currency = 'TWD' | 'USD' | 'EUR' | 'JPY' | 'CNY'

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export interface CreateQuotationInput {
  customer_id: string
  issue_date: string
  valid_until: string
  currency: Currency
  tax_rate: number
  notes?: string
  items: CreateQuotationItemInput[]
}

export interface CreateQuotationItemInput {
  product_id: string
  quantity: number
  unit_price: number
  discount: number
}

export interface UpdateQuotationInput extends Partial<CreateQuotationInput> {
  status?: QuotationStatus
}

// types/customer.ts
export interface Customer {
  id: string
  name: BilingualText
  email: string
  phone: string | null
  address: BilingualText | null
  created_at: string
  updated_at: string
}

export interface BilingualText {
  zh: string
  en: string
}

// types/api.ts
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}
```

### 5.3 錯誤邊界處理

#### 全域錯誤邊界

```typescript
// app/error.tsx
'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 記錄到錯誤追蹤服務
    console.error('Global error:', error)
    // Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                系統發生錯誤
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                我們正在處理這個問題。請稍後再試。
              </p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="mt-4 text-xs text-left bg-gray-100 p-3 rounded overflow-auto">
                  {error.message}
                </pre>
              )}
              <div className="mt-6 flex gap-4">
                <button
                  onClick={reset}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  重試
                </button>
                <a
                  href="/"
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-center"
                >
                  返回首頁
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

// components/ErrorBoundary.tsx (用於特定組件)
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">發生錯誤</p>
          <p className="text-sm text-red-600 mt-1">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-sm text-red-700 underline"
          >
            重試
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// 使用範例
<ErrorBoundary
  fallback={<div>無法載入圖表</div>}
  onError={(error) => {
    // 記錄錯誤
    console.error(error)
  }}
>
  <DashboardCharts {...props} />
</ErrorBoundary>
```

### 5.4 Loading 狀態管理

#### 建立統一的 Loading 組件

```typescript
// components/ui/Loading.tsx
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-indigo-600`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">載入中...</p>
      </div>
    </div>
  )
}

export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-900">處理中...</p>
      </div>
    </div>
  )
}

// components/ui/Skeleton.tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Skeleton className="h-6 w-1/3 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}
```

---

## 6. QuotationForm.tsx 重構計劃

### 6.1 目標架構

```
app/[locale]/quotations/new/
├── page.tsx                          # Server Component (資料獲取)
└── components/
    ├── QuotationForm.tsx             # 主表單組件 (~150 行)
    ├── QuotationBasicInfo.tsx        # 基本資訊 (~100 行)
    │   ├── CustomerSelector.tsx      # 客戶選擇器 (~80 行)
    │   └── CurrencySelector.tsx      # 幣別選擇器 (~60 行)
    ├── QuotationItemList.tsx         # 品項列表 (~100 行)
    │   ├── QuotationItemRow.tsx      # 單一品項 (~80 行)
    │   └── ProductSelector.tsx       # 產品選擇器 (~80 行)
    ├── QuotationSummary.tsx          # 總計區 (~60 行)
    ├── QuotationNotes.tsx            # 備註與模版 (~120 行)
    └── hooks/
        ├── useQuotationForm.ts       # 表單狀態管理 (~150 行)
        ├── useExchangeRate.ts        # 匯率處理 (~80 行)
        └── useNoteTemplates.ts       # 備註模版 (~60 行)
```

### 6.2 重構步驟

#### Step 1: 建立自訂 Hooks

```typescript
// app/[locale]/quotations/new/hooks/useQuotationForm.ts
import { useState, useCallback } from 'react'
import type { QuotationFormData, QuotationItem } from '@/types/quotation'

export function useQuotationForm(initialData?: Partial<QuotationFormData>) {
  const [formData, setFormData] = useState<QuotationFormData>({
    customerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'TWD',
    taxRate: 5,
    notes: '',
    ...initialData,
  })

  const [items, setItems] = useState<QuotationItem[]>([])

  const updateFormData = useCallback((updates: Partial<QuotationFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
      subtotal: 0,
    }])
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateItem = useCallback((
    index: number,
    updates: Partial<QuotationItem>
  ) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], ...updates }

      // 重新計算小計
      const item = newItems[index]
      item.subtotal = (item.quantity * item.unit_price) + item.discount

      return newItems
    })
  }, [])

  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const taxAmount = (subtotal * formData.taxRate) / 100
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }, [items, formData.taxRate])

  return {
    formData,
    updateFormData,
    items,
    addItem,
    removeItem,
    updateItem,
    calculateTotals,
  }
}

// app/[locale]/quotations/new/hooks/useExchangeRate.ts
import { useState, useEffect, useCallback } from 'react'
import type { Currency } from '@/types/quotation'

interface ExchangeRates {
  [key: string]: number
}

export function useExchangeRate(baseCurrency: Currency) {
  const [rates, setRates] = useState<ExchangeRates>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/exchange-rates?base=${baseCurrency}`)
        const data = await response.json()

        if (data.success) {
          setRates(data.rates)
          setError(null)
        } else {
          setError(data.error || 'Failed to fetch rates')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchRates()
  }, [baseCurrency])

  const convertPrice = useCallback((
    price: number,
    fromCurrency: Currency,
    toCurrency: Currency
  ): number => {
    if (fromCurrency === toCurrency) return price

    const rate = rates[fromCurrency]
    if (!rate || rate === 0) {
      console.warn(`No exchange rate for ${fromCurrency}`)
      return price
    }

    return price / rate
  }, [rates])

  return { rates, loading, error, convertPrice }
}

// app/[locale]/quotations/new/hooks/useNoteTemplates.ts
import { useLocalStorage } from '@/hooks/useLocalStorage'

const DEFAULT_TEMPLATES = {
  zh: {
    standard: '本報價單有效期限為 7 天。\n付款條件：簽約後 30 天內付清。\n交貨時間：收到訂單後 14 個工作天。',
    urgent: '本報價單有效期限為 3 天。\n付款條件：簽約後 7 天內付清。\n交貨時間：收到訂單後 7 個工作天（加急處理）。',
    // ... 其他模版
  },
  en: {
    // ... 英文模版
  },
}

export function useNoteTemplates(locale: string) {
  const [customTemplates, setCustomTemplates] = useLocalStorage<Record<string, string>>(
    'customNoteTemplates',
    {}
  )

  const defaultTemplates = DEFAULT_TEMPLATES[locale as 'zh' | 'en'] || DEFAULT_TEMPLATES.zh

  const saveTemplate = (name: string, content: string) => {
    setCustomTemplates(prev => ({ ...prev, [name]: content }))
  }

  const deleteTemplate = (name: string) => {
    setCustomTemplates(prev => {
      const newTemplates = { ...prev }
      delete newTemplates[name]
      return newTemplates
    })
  }

  return {
    defaultTemplates,
    customTemplates,
    saveTemplate,
    deleteTemplate,
  }
}
```

#### Step 2: 拆分子組件

```typescript
// app/[locale]/quotations/new/components/QuotationBasicInfo.tsx
'use client'

import CustomerSelector from './CustomerSelector'
import CurrencySelector from './CurrencySelector'
import FormInput from '@/components/ui/FormInput'
import type { Customer } from '@/types/customer'
import type { Currency } from '@/types/quotation'

interface QuotationBasicInfoProps {
  locale: string
  customers: Customer[]
  customerId: string
  onCustomerChange: (customerId: string) => void
  issueDate: string
  validUntil: string
  onValidUntilChange: (date: string) => void
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
  exchangeRates: Record<string, number>
}

export default function QuotationBasicInfo({
  locale,
  customers,
  customerId,
  onCustomerChange,
  issueDate,
  validUntil,
  onValidUntilChange,
  currency,
  onCurrencyChange,
  exchangeRates,
}: QuotationBasicInfoProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <CustomerSelector
          locale={locale}
          customers={customers}
          value={customerId}
          onChange={onCustomerChange}
        />

        <CurrencySelector
          locale={locale}
          value={currency}
          onChange={onCurrencyChange}
          exchangeRates={exchangeRates}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label={locale === 'zh' ? '開立日期' : 'Issue Date'}
          name="issueDate"
          type="text"
          value={new Date(issueDate).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')}
          onChange={() => {}}
          disabled
        />

        <FormInput
          label={locale === 'zh' ? '有效期限' : 'Valid Until'}
          name="validUntil"
          type="date"
          value={validUntil}
          onChange={onValidUntilChange}
          required
        />
      </div>
    </div>
  )
}

// app/[locale]/quotations/new/components/CustomerSelector.tsx
'use client'

import { useState, useMemo } from 'react'
import { Combobox } from '@headlessui/react'
import type { Customer } from '@/types/customer'

interface CustomerSelectorProps {
  locale: string
  customers: Customer[]
  value: string
  onChange: (customerId: string) => void
}

export default function CustomerSelector({
  locale,
  customers,
  value,
  onChange,
}: CustomerSelectorProps) {
  const [query, setQuery] = useState('')

  const selectedCustomer = useMemo(
    () => customers.find(c => c.id === value) || null,
    [customers, value]
  )

  const filteredCustomers = useMemo(() => {
    if (query === '') return customers

    const lowerQuery = query.toLowerCase()
    return customers.filter(customer =>
      customer.name.zh.toLowerCase().includes(lowerQuery) ||
      customer.name.en.toLowerCase().includes(lowerQuery) ||
      customer.email.toLowerCase().includes(lowerQuery)
    )
  }, [customers, query])

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-1">
        {locale === 'zh' ? '客戶' : 'Customer'}
        <span className="text-red-500 ml-1">*</span>
      </label>

      <Combobox
        value={selectedCustomer}
        onChange={(customer) => onChange(customer?.id || '')}
      >
        <div className="relative">
          <Combobox.Button as="div" className="relative">
            <Combobox.Input
              className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 cursor-pointer"
              displayValue={(customer: Customer | null) =>
                customer
                  ? `${customer.name[locale as 'zh' | 'en']} (${customer.email})`
                  : ''
              }
              onChange={(e) => setQuery(e.target.value)}
              placeholder={locale === 'zh' ? '選擇客戶' : 'Select Customer'}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </Combobox.Button>

          <Combobox.Options className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg bg-white py-1 shadow-lg border border-gray-300">
            {filteredCustomers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {locale === 'zh' ? '無搜尋結果' : 'No results'}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <Combobox.Option
                  key={customer.id}
                  value={customer}
                  className={({ active }) =>
                    `cursor-pointer select-none px-3 py-2 text-sm ${
                      active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                    }`
                  }
                >
                  {customer.name[locale as 'zh' | 'en']} ({customer.email})
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>

      <button
        type="button"
        onClick={() => window.open(`/${locale}/customers/new`, '_blank')}
        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
      >
        + {locale === 'zh' ? '新增客戶' : 'Add Customer'}
      </button>
    </div>
  )
}

// app/[locale]/quotations/new/components/QuotationItemList.tsx
'use client'

import QuotationItemRow from './QuotationItemRow'
import Button from '@/components/ui/Button'
import type { Product } from '@/types/product'
import type { QuotationItem } from '@/types/quotation'

interface QuotationItemListProps {
  locale: string
  items: QuotationItem[]
  products: Product[]
  onAddItem: () => void
  onRemoveItem: (index: number) => void
  onUpdateItem: (index: number, updates: Partial<QuotationItem>) => void
  convertPrice: (price: number, from: string, to: string) => number
}

export default function QuotationItemList({
  locale,
  items,
  products,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  convertPrice,
}: QuotationItemListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {locale === 'zh' ? '報價項目' : 'Quotation Items'}
        </h3>
        <Button onClick={onAddItem} size="sm">
          {locale === 'zh' ? '新增項目' : 'Add Item'}
        </Button>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8 border border-gray-200 rounded-lg text-gray-500">
            {locale === 'zh' ? '尚未新增項目' : 'No items added'}
          </div>
        ) : (
          items.map((item, index) => (
            <QuotationItemRow
              key={index}
              locale={locale}
              index={index}
              item={item}
              products={products}
              onUpdate={(updates) => onUpdateItem(index, updates)}
              onRemove={() => onRemoveItem(index)}
              convertPrice={convertPrice}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

#### Step 3: 主組件組合

```typescript
// app/[locale]/quotations/new/components/QuotationForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import QuotationBasicInfo from './QuotationBasicInfo'
import QuotationItemList from './QuotationItemList'
import QuotationSummary from './QuotationSummary'
import QuotationNotes from './QuotationNotes'
import Button from '@/components/ui/Button'
import { useQuotationForm } from '../hooks/useQuotationForm'
import { useExchangeRate } from '../hooks/useExchangeRate'
import { useNoteTemplates } from '../hooks/useNoteTemplates'
import type { Customer } from '@/types/customer'
import type { Product } from '@/types/product'

interface QuotationFormProps {
  locale: string
  customers: Customer[]
  products: Product[]
}

export default function QuotationForm({
  locale,
  customers,
  products,
}: QuotationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    formData,
    updateFormData,
    items,
    addItem,
    removeItem,
    updateItem,
    calculateTotals,
  } = useQuotationForm()

  const { rates, convertPrice } = useExchangeRate(formData.currency)
  const { defaultTemplates, customTemplates, saveTemplate, deleteTemplate } = useNoteTemplates(locale)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.customerId) {
        throw new Error(locale === 'zh' ? '請選擇客戶' : 'Please select a customer')
      }

      if (items.length === 0) {
        throw new Error(locale === 'zh' ? '請至少新增一個項目' : 'Please add at least one item')
      }

      const { subtotal, taxAmount, total } = calculateTotals()

      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customerId,
          issue_date: formData.issueDate,
          valid_until: formData.validUntil,
          currency: formData.currency,
          subtotal,
          tax_rate: formData.taxRate,
          tax_amount: taxAmount,
          total_amount: total,
          notes: formData.notes || null,
          items,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      router.push(`/${locale}/quotations`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totals = calculateTotals()

  if (customers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">
          {locale === 'zh' ? '尚未建立客戶，請先新增客戶' : 'No customers found. Please add a customer first.'}
        </p>
        <Button onClick={() => router.push(`/${locale}/customers/new`)}>
          {locale === 'zh' ? '新增客戶' : 'Add Customer'}
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <QuotationBasicInfo
        locale={locale}
        customers={customers}
        customerId={formData.customerId}
        onCustomerChange={(id) => updateFormData({ customerId: id })}
        issueDate={formData.issueDate}
        validUntil={formData.validUntil}
        onValidUntilChange={(date) => updateFormData({ validUntil: date })}
        currency={formData.currency}
        onCurrencyChange={(currency) => updateFormData({ currency })}
        exchangeRates={rates}
      />

      <QuotationItemList
        locale={locale}
        items={items}
        products={products}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItem={updateItem}
        convertPrice={convertPrice}
      />

      <QuotationSummary
        locale={locale}
        currency={formData.currency}
        subtotal={totals.subtotal}
        taxRate={formData.taxRate}
        taxAmount={totals.taxAmount}
        total={totals.total}
        onTaxRateChange={(rate) => updateFormData({ taxRate: rate })}
      />

      <QuotationNotes
        locale={locale}
        value={formData.notes}
        onChange={(notes) => updateFormData({ notes })}
        defaultTemplates={defaultTemplates}
        customTemplates={customTemplates}
        onSaveTemplate={saveTemplate}
        onDeleteTemplate={deleteTemplate}
      />

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${locale}/quotations`)}
          disabled={isSubmitting}
        >
          {locale === 'zh' ? '取消' : 'Cancel'}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {locale === 'zh' ? '儲存' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
```

### 6.3 重構效益

**重構前**：
- 837 行單一檔案
- 14 個獨立 useState
- 難以測試和維護
- 不易重複使用邏輯

**重構後**：
- 主組件約 150 行
- 6 個專責子組件 (60-120 行)
- 3 個自訂 hooks (60-150 行)
- 關注點分離清晰
- 易於測試各個部分
- 可重複使用的邏輯和組件

**程式碼對比**：
```typescript
// ❌ 重構前：所有邏輯混在一起 (837 行)
function QuotationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [exchangeRates, setExchangeRates] = useState({})
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [productQueries, setProductQueries] = useState({})
  const [selectedProducts, setSelectedProducts] = useState({})
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [customTemplates, setCustomTemplates] = useState({})
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [customExchangeRate, setCustomExchangeRate] = useState('')
  const [formData, setFormData] = useState({...})
  const [items, setItems] = useState([])

  // 400+ 行邏輯...

  return (
    <form>
      {/* 400+ 行 JSX... */}
    </form>
  )
}

// ✅ 重構後：清晰的組件組合 (150 行)
function QuotationForm({ locale, customers, products }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // 邏輯分離到自訂 hooks
  const form = useQuotationForm()
  const exchange = useExchangeRate(form.formData.currency)
  const templates = useNoteTemplates(locale)

  const handleSubmit = async (e) => {
    // 簡潔的提交邏輯 (~40 行)
  }

  return (
    <form onSubmit={handleSubmit}>
      <QuotationBasicInfo {...basicInfoProps} />
      <QuotationItemList {...itemListProps} />
      <QuotationSummary {...summaryProps} />
      <QuotationNotes {...notesProps} />
      <FormActions />
    </form>
  )
}
```

---

## 7. 其他需要重構的組件

### 7.1 QuotationEditForm.tsx (593 行)

**問題**：
- 與 QuotationForm.tsx 重複程式碼高達 80%
- 應該共用相同的子組件和 hooks

**解決方案**：
```typescript
// 共用組件和 hooks
// app/[locale]/quotations/components/ (共用)
// app/[locale]/quotations/hooks/ (共用)

// app/[locale]/quotations/new/page.tsx
export default function NewQuotationPage() {
  return <QuotationForm mode="create" />
}

// app/[locale]/quotations/[id]/edit/page.tsx
export default async function EditQuotationPage({ params }) {
  const quotation = await getQuotation(params.id)
  return <QuotationForm mode="edit" quotation={quotation} />
}

// QuotationForm.tsx 支援兩種模式
function QuotationForm({ mode, quotation }: { mode: 'create' | 'edit', quotation?: Quotation }) {
  const form = useQuotationForm(quotation)

  const handleSubmit = async (e) => {
    if (mode === 'create') {
      // 建立邏輯
    } else {
      // 更新邏輯
    }
  }

  // ... 其餘相同
}
```

### 7.2 QuotationList.tsx (493 行)

**重構方案**：
```
QuotationList.tsx (150 行)
├── QuotationFilters.tsx (80 行)
├── QuotationTable.tsx (100 行)
│   └── QuotationRow.tsx (60 行)
└── hooks/
    └── useQuotationFilters.ts (60 行)
```

### 7.3 CompanySettings.tsx (490 行)

**重構方案**：
```
CompanySettings.tsx (100 行)
├── CompanyBasicInfo.tsx
├── CompanyBankingInfo.tsx
├── CompanyTaxInfo.tsx
└── hooks/
    └── useCompanySettings.ts
```

---

## 8. 實施優先級與時程建議

### Phase 1: 基礎優化 (1-2 週)
**優先級：高**
1. ✅ 建立共用 UI 組件庫 (Button, Input, Select, Card)
2. ✅ 新增 loading.tsx 和 error.tsx 到所有路由
3. ✅ 修正過度使用 'use client' 的問題
4. ✅ 建立集中的 TypeScript 類型定義

### Phase 2: QuotationForm 重構 (2-3 週)
**優先級：高**
1. ✅ 建立自訂 hooks (useQuotationForm, useExchangeRate, useNoteTemplates)
2. ✅ 拆分子組件 (CustomerSelector, ProductSelector, ItemList 等)
3. ✅ 整合並測試
4. ✅ 文檔化新架構

### Phase 3: Server Actions 遷移 (2-3 週)
**優先級：中**
1. ✅ 建立 app/actions/ 目錄結構
2. ✅ 遷移 Quotation CRUD 到 Server Actions
3. ✅ 遷移 Customer、Product CRUD
4. ✅ 使用 useFormState 和 useFormStatus

### Phase 4: 其他組件重構 (3-4 週)
**優先級：中**
1. ✅ QuotationEditForm 與 QuotationForm 整合
2. ✅ QuotationList 拆分
3. ✅ CompanySettings 重構
4. ✅ ProductList、CustomerList 優化

### Phase 5: 性能優化 (1-2 週)
**優先級：中低**
1. ✅ 動態引入重型組件
2. ✅ 圖片優化 (使用 next/image)
3. ✅ Bundle size 分析與優化
4. ✅ 添加 React.memo、useMemo、useCallback

### Phase 6: 進階功能 (2-3 週)
**優先級：低**
1. ✅ 實作 useOptimistic 樂觀更新
2. ✅ 錯誤追蹤整合 (Sentry)
3. ✅ 性能監控整合
4. ✅ 測試覆蓋率提升

---

## 9. 檢查清單

### 程式碼品質
- [ ] 所有組件單一職責
- [ ] 複雜組件拆分為子組件 (< 200 行)
- [ ] 業務邏輯提取到 hooks
- [ ] 適當使用 TypeScript 類型
- [ ] 移除不必要的 'use client'
- [ ] 錯誤邊界覆蓋所有路由
- [ ] Loading 狀態適當處理

### 性能
- [ ] Server Components 優先使用
- [ ] 重型組件動態引入
- [ ] 使用 React.memo 避免不必要重渲染
- [ ] 使用 useMemo 快取昂貴計算
- [ ] 使用 useCallback 穩定回呼函數
- [ ] 圖片使用 next/image 優化

### React 19 & Next.js 15
- [ ] 使用 Server Actions 取代部分 API Routes
- [ ] 使用 useFormState 處理表單
- [ ] 使用 useOptimistic 樂觀更新
- [ ] 適當使用 Suspense
- [ ] 每個路由有 loading.tsx
- [ ] 每個路由有 error.tsx

### 可維護性
- [ ] 清晰的檔案結構
- [ ] 共用組件有文檔
- [ ] 複雜邏輯有註解
- [ ] 一致的命名規範
- [ ] 程式碼有適當測試

---

## 10. 總結與建議

### 主要優勢
1. ✅ **正確的技術選型**：Next.js 15 + React 19 + Server Components
2. ✅ **良好的國際化架構**：next-intl 整合完善
3. ✅ **清晰的路由結構**：App Router 使用正確

### 關鍵改進點
1. 🔴 **QuotationForm.tsx 急需重構**：837 行太長，違反 SRP
2. ⚠️ **缺少共用 hooks**：重複邏輯應提取
3. ⚠️ **過度使用客戶端渲染**：許多組件可以是 Server Components
4. 🔴 **缺少錯誤處理**：需要全域和局部錯誤邊界
5. ⚠️ **未充分利用 React 19**：應使用 Server Actions、useOptimistic

### 立即行動項目
1. **本週**：建立共用 UI 組件庫和類型定義
2. **下週**：開始 QuotationForm.tsx 重構
3. **兩週內**：新增所有 loading.tsx 和 error.tsx
4. **一個月內**：完成 Server Actions 遷移

### 長期目標
- 所有表單組件 < 200 行
- 測試覆蓋率 > 80%
- Lighthouse 分數 > 90
- Bundle size 減少 30%

---

**報告產生日期**：2025-10-20
**分析範圍**：/Users/avyshiu/Claudecode/quotation-system
**技術棧**：Next.js 15.5.5, React 19.1.0, TypeScript 5.x
