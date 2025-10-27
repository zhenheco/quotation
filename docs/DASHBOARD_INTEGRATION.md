# 儀表板整合文檔

## 概述

本文檔說明如何將儀表板與統計功能整合到 API hooks 系統中,包含架構設計、使用方式和最佳實踐。

## 整合完成日期

2025-10-25

## 架構概覽

### 整合前後對比

#### 整合前（Server Component 架構）
```
Dashboard Page (Server Component)
  ├── 直接調用 analytics.ts 服務函數
  ├── 在伺服器端獲取所有數據
  └── 無法自動刷新或即時更新
```

#### 整合後（Client Component + API Hooks 架構）
```
Dashboard Page (Server Component - 認證檢查)
  └── DashboardClient (Client Component)
      ├── useFullDashboardData() - 統一數據獲取
      │   ├── useRevenueTrend()
      │   ├── useCurrencyDistribution()
      │   ├── useStatusStatistics()
      │   ├── useDashboardSummary()
      │   └── useDashboardStats()
      ├── usePaymentStatistics() - 付款統計
      ├── usePaymentReminders() - 付款提醒
      └── useOverdueContracts() - 逾期合約
```

## 新增檔案

### 1. Hooks 層

#### `/hooks/useAnalytics.ts`
提供儀表板統計資料的 React Query hooks。

**主要 Hooks:**
- `useRevenueTrend(months)` - 營收趨勢（預設 6 個月）
- `useCurrencyDistribution()` - 幣別分布
- `useStatusStatistics()` - 報價單狀態統計
- `useDashboardSummary()` - 儀表板摘要（成長率、轉換率等）
- `useDashboardStats()` - 完整業務統計
- `useFullDashboardData(months)` - 一次性獲取所有儀表板數據

**自動刷新配置:**
- `staleTime: 10 * 60 * 1000` (10 分鐘)
- `refetchInterval: 10 * 60 * 1000` (10 分鐘自動刷新)

### 2. API 端點

#### `/app/api/analytics/dashboard-stats/route.ts`
**GET** `/api/analytics/dashboard-stats`

返回完整的儀表板統計數據:
```typescript
{
  quotations: {
    draft: number
    sent: number
    accepted: number
    rejected: number
    total: number
  }
  contracts: {
    active: number
    overdue: number
    expiring_soon: number
    total: number
  }
  payments: {
    current_month_collected: number
    current_year_collected: number
    total_unpaid: number
    total_overdue: number
    currency: string
  }
  customers: {
    total: number
    active: number
  }
  products: {
    total: number
  }
}
```

#### `/app/api/analytics/revenue-trend/route.ts`
**GET** `/api/analytics/revenue-trend?months=6`

返回營收趨勢數據（按月份）:
```typescript
[
  {
    month: string  // "2025年10月"
    revenue: number
    count: number
  }
]
```

#### `/app/api/analytics/currency-distribution/route.ts`
**GET** `/api/analytics/currency-distribution`

返回幣別分布數據:
```typescript
[
  {
    currency: string  // "TWD", "USD", etc.
    value: number
    count: number
  }
]
```

#### `/app/api/analytics/status-statistics/route.ts`
**GET** `/api/analytics/status-statistics`

返回報價單狀態統計:
```typescript
[
  {
    status: string  // "draft", "sent", "accepted", "rejected"
    count: number
    value: number
  }
]
```

#### `/app/api/analytics/dashboard-summary/route.ts`
**GET** `/api/analytics/dashboard-summary`

返回儀表板摘要（關鍵指標）:
```typescript
{
  currentMonthRevenue: number
  revenueGrowth: number
  currentMonthCount: number
  countGrowth: number
  conversionRate: number
  acceptedCount: number
  pendingCount: number
  draftCount: number
}
```

### 3. UI 元件

#### `/app/[locale]/dashboard/DashboardClient.tsx`
主要的儀表板 Client Component,包含:

**元件結構:**
- `StatCard` - 統計卡片元件
- `QuickActionCard` - 快速操作卡片
- `AlertCard` - 警告/提醒卡片
- `DashboardClient` - 主儀表板元件

**顯示區塊:**
1. 提醒與警告區
   - 逾期合約提醒
   - 即將到期的付款提醒

2. 主要統計卡片
   - 本月營收（含成長率）
   - 本月報價單（含成長率）
   - 轉換率
   - 待處理項目

3. 業務統計卡片
   - 活躍合約
   - 本月收款
   - 未收款總額
   - 客戶總數

4. 圖表區域（使用 DashboardCharts 元件）
   - 營收趨勢圖
   - 幣別分布圖
   - 狀態統計圖

5. 快速操作區
   - 建立報價單
   - 新增客戶
   - 新增產品
   - 管理合約
   - 收款記錄
   - 報價單列表

#### `/app/[locale]/dashboard/page.tsx`
簡化的 Server Component,負責:
- 用戶認證檢查
- 傳遞 locale 參數給 DashboardClient

#### `/components/LoadingSpinner.tsx`
載入狀態指示器元件。

## 使用方式

### 基本使用

```tsx
'use client'

import { useFullDashboardData } from '@/hooks/useAnalytics'
import { usePaymentStatistics } from '@/hooks/usePayments'
import { useOverdueContracts } from '@/hooks/useContracts'

export default function Dashboard() {
  // 取得所有儀表板數據
  const dashboardData = useFullDashboardData(6)
  const { data: paymentStats } = usePaymentStatistics()
  const { data: overdueContracts } = useOverdueContracts()

  if (dashboardData.isLoading) {
    return <LoadingSpinner />
  }

  if (dashboardData.hasError) {
    return <ErrorMessage />
  }

  const { summary, stats, revenueTrend, currencyDistribution, statusStats } = dashboardData

  return (
    <div>
      <h1>儀表板</h1>
      {/* 渲染統計卡片 */}
      {/* 渲染圖表 */}
    </div>
  )
}
```

### 單獨使用特定 Hook

```tsx
import { useDashboardStats } from '@/hooks/useAnalytics'

export default function StatsOverview() {
  const { data: stats, isLoading, error, refetch } = useDashboardStats()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!stats) return null

  return (
    <div>
      <h2>報價單統計</h2>
      <p>草稿: {stats.quotations.draft}</p>
      <p>已發送: {stats.quotations.sent}</p>
      <p>已接受: {stats.quotations.accepted}</p>
      <button onClick={() => refetch()}>刷新</button>
    </div>
  )
}
```

### 手動刷新所有數據

```tsx
const dashboardData = useFullDashboardData()

// 手動刷新所有數據
const handleRefresh = () => {
  dashboardData.refetchAll()
}
```

## 自動刷新機制

### 統計數據（10 分鐘）
以下 hooks 設定為 10 分鐘自動刷新:
- `useRevenueTrend()`
- `useCurrencyDistribution()`
- `useStatusStatistics()`
- `useDashboardSummary()`
- `useDashboardStats()`
- `usePaymentStatistics()` (來自 usePayments.ts)

### 提醒數據（5 分鐘）
以下 hooks 設定為 5 分鐘自動刷新:
- `usePaymentReminders()` (來自 usePayments.ts)
- `useOverdueContracts()` (來自 useContracts.ts)

### 配置說明

```typescript
export function useDashboardStats() {
  return useQuery({
    queryKey: ['analytics', 'dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 10 * 60 * 1000,      // 10 分鐘內不重新獲取
    refetchInterval: 10 * 60 * 1000, // 每 10 分鐘自動刷新
  })
}
```

## 響應式設計

### 斷點設計

```tsx
// 統計卡片網格
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 在手機上單列,平板上雙列,桌面上四列 */}
</div>

// 圖表區域
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* 在手機和平板上單列,桌面上雙列 */}
</div>

// 快速操作
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 在手機上單列,小螢幕上雙列,大螢幕上三列 */}
</div>
```

### 手機端優化

1. **統計卡片**
   - 單列顯示,便於滾動查看
   - 保留所有資訊,不縮減內容

2. **提醒卡片**
   - 限制高度 `max-h-48`,可滾動
   - 只顯示前 5 筆,避免佔據過多空間

3. **圖表**
   - 響應式寬度,自動調整大小
   - 維持可讀性

## 權限控制

目前所有統計數據都基於 `user_id` 進行過濾,確保用戶只能看到自己的數據。

### 未來擴展 - 管理員權限

可以在 `/app/api/analytics/dashboard-stats/route.ts` 中加入權限檢查:

```typescript
import { checkPermission } from '@/lib/services/rbac'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 檢查是否為管理員
  const isAdmin = await checkPermission(user.id, 'view_all_stats')

  if (isAdmin) {
    // 返回所有用戶的統計
  } else {
    // 只返回當前用戶的統計
  }
}
```

## 效能優化

### 1. React Query 快取

所有數據都透過 React Query 進行快取管理:
- 相同查詢不會重複請求
- 自動背景更新
- 智能失效管理

### 2. 並行請求

使用 `Promise.all()` 並行獲取多個統計數據:

```typescript
// 在 API 端點中
const [quotationsResult, contractsResult, paymentsResult] = await Promise.all([
  supabase.from('quotations').select('...'),
  supabase.from('customer_contracts').select('...'),
  supabase.rpc('get_payment_statistics'),
])
```

### 3. 資料庫索引

確保以下欄位有索引:
- `quotations.user_id`
- `quotations.status`
- `quotations.issue_date`
- `customer_contracts.user_id`
- `customer_contracts.status`
- `customer_contracts.next_collection_date`

## 錯誤處理

### API 端點錯誤處理

```typescript
try {
  // 查詢數據
} catch (error: any) {
  console.error('Failed to fetch dashboard stats:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}
```

### 前端錯誤處理

```tsx
if (dashboardData.hasError) {
  return (
    <div className="text-center">
      <p className="text-red-600">載入儀表板數據時發生錯誤</p>
      <button onClick={() => dashboardData.refetchAll()}>
        重新載入
      </button>
    </div>
  )
}
```

## 測試建議

### 1. 單元測試

測試 API 端點:
```typescript
describe('GET /api/analytics/dashboard-stats', () => {
  it('should return dashboard stats for authenticated user', async () => {
    // 測試邏輯
  })

  it('should return 401 for unauthenticated user', async () => {
    // 測試邏輯
  })
})
```

### 2. 整合測試

測試 hooks:
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardStats } from '@/hooks/useAnalytics'

describe('useDashboardStats', () => {
  it('should fetch dashboard stats', async () => {
    const { result } = renderHook(() => useDashboardStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
  })
})
```

### 3. E2E 測試

測試完整流程:
```typescript
describe('Dashboard Page', () => {
  it('should display all dashboard sections', () => {
    cy.login()
    cy.visit('/zh/dashboard')

    cy.contains('本月營收').should('be.visible')
    cy.contains('本月報價單').should('be.visible')
    cy.contains('轉換率').should('be.visible')
    cy.contains('待處理').should('be.visible')
  })

  it('should refresh data on button click', () => {
    cy.login()
    cy.visit('/zh/dashboard')

    cy.contains('重新載入').click()
    cy.contains('載入中').should('be.visible')
    // 等待數據載入完成
  })
})
```

## 已知問題與限制

### 1. 付款統計 RPC 函數

`/app/api/analytics/dashboard-stats/route.ts` 中使用了 `supabase.rpc('get_payment_statistics')`,需要確保此函數在資料庫中已定義。

如果不存在,需要在 Supabase 中創建此函數,或改為直接查詢:

```typescript
// 替代方案：直接查詢
const { data: payments } = await supabase
  .from('payments')
  .select('*')
  .eq('user_id', user.id)

// 手動計算統計
const currentMonth = new Date()
currentMonth.setDate(1)

const currentMonthPayments = payments.filter(p =>
  new Date(p.payment_date) >= currentMonth
)

const stats = {
  current_month: {
    total_collected: currentMonthPayments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0),
    // ... 其他統計
  }
}
```

### 2. 預設貨幣

目前預設貨幣從付款統計中獲取,如果沒有付款記錄則預設為 TWD。

可以考慮從用戶設定中獲取:
```typescript
const { data: userSettings } = await supabase
  .from('user_settings')
  .select('default_currency')
  .eq('user_id', user.id)
  .single()

const defaultCurrency = userSettings?.default_currency || 'TWD'
```

## 未來改進方向

### 1. 即時通知

整合 Supabase Realtime,在有新的逾期合約或付款提醒時即時通知:

```typescript
const channel = supabase
  .channel('dashboard-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'customer_contracts',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    // 觸發重新獲取
    queryClient.invalidateQueries(['contracts', 'overdue'])
  })
  .subscribe()
```

### 2. 自訂時間範圍

允許用戶選擇統計的時間範圍:

```tsx
const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-12-31' })
const { data } = useRevenueTrend({ dateRange })
```

### 3. 圖表互動

增強圖表互動性:
- 點擊圖表元素查看詳細資料
- 拖曳選擇時間範圍
- 匯出圖表為圖片

### 4. 效能監控

使用 React Query DevTools 監控查詢效能:

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### 5. 離線支援

使用 React Query 的持久化功能,支援離線查看最後獲取的數據:

```typescript
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

persistQueryClient({
  queryClient,
  persister,
})
```

## 相關文檔

- [API 整合架構](./API_INTEGRATION_ARCHITECTURE.md)
- [API 整合快速入門](./API_INTEGRATION_QUICKSTART.md)
- [客戶管理整合](./CUSTOMER_INTEGRATION.md)
- [產品管理整合](./PRODUCT_INTEGRATION.md)
- [React Query 文檔](https://tanstack.com/query/latest)
- [Recharts 文檔](https://recharts.org/)

## 變更歷史

### 2025-10-25
- 初始版本
- 完成儀表板與統計功能整合
- 實作自動刷新機制
- 建立完整的 API 端點
- 重構儀表板為 Client Component
