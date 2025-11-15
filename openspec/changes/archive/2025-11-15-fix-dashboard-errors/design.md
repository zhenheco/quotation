# Design Document: Dashboard Error Handling Architecture

## Overview

本文件說明儀表板錯誤修復的技術架構決策，包括防禦性編程模式、錯誤邊界策略，以及資料格式化安全性的實作方式。

## Architecture Decisions

### 1. 防禦性編程策略 (Defensive Programming)

**決策**：採用 TypeScript 的 Nullish Coalescing (`??`) 和 Optional Chaining (`?.`) 作為主要防禦機制。

**理由**：
- **符合 2025 年最佳實踐**：根據最新研究，`??` 和 `?.` 是處理 null/undefined 的推薦方式
- **類型安全**：與 TypeScript 的 `strictNullChecks` 完美整合
- **效能優勢**：編譯時優化，無執行時開銷
- **程式碼簡潔**：相比傳統的 `if` 檢查，程式碼更簡潔易讀

**替代方案考量**：
- ❌ 使用 `||` (邏輯或)：會將 `0` 和 `''` 視為 falsy，不適合數值格式化
- ❌ 使用 `if` 條件檢查：程式碼冗長，不符合現代實踐
- ✅ 使用 `??` (Nullish Coalescing)：僅處理 `null` 和 `undefined`，保持 `0` 和 `''` 的語義

### 2. 錯誤邊界架構 (Error Boundary Architecture)

**決策**：在儀表板層級使用 React Error Boundary，但不依賴它來處理資料格式化錯誤。

**理由**：
- **主動預防 > 被動捕獲**：在資料格式化時主動檢查，而非等待錯誤發生
- **使用者體驗**：避免整個儀表板崩潰，只需要局部處理
- **除錯效率**：明確的錯誤來源，而非被 Error Boundary 統一捕獲

**Next.js 15 Error Boundary 模式**：
```typescript
// app/[locale]/dashboard/error.tsx
'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 記錄到錯誤追蹤服務
    console.error('Dashboard Error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-semibold text-red-600">儀表板載入錯誤</h2>
      <p className="text-gray-600 mt-2">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        重新載入
      </button>
    </div>
  )
}
```

### 3. 資料格式化層次結構 (Data Formatting Hierarchy)

**決策**：建立三層防護機制。

**第一層：API 回應驗證**
```typescript
// hooks/usePayments.ts
export function usePaymentStatistics() {
  return useQuery({
    queryKey: ['payments', 'statistics'],
    queryFn: fetchPaymentStatistics,
    select: (data) => ({
      current_month: {
        total_collected: data.current_month?.total_collected ?? 0,
        total_pending: data.current_month?.total_pending ?? 0,
        total_overdue: data.current_month?.total_overdue ?? 0,
        currency: data.current_month?.currency ?? 'TWD',
      },
      // ... 其他欄位
    }),
  })
}
```

**第二層：格式化函式防護**
```typescript
// DashboardClient.tsx
const formatCurrency = (amount: number | undefined | null): string => {
  const validAmount = amount ?? 0
  return `${defaultCurrency} ${validAmount.toLocaleString()}`
}
```

**第三層：UI 渲染防護**
```typescript
// AlertCard 組件
{item.amount !== undefined && (
  <div className="text-xs text-gray-600 mt-1">
    金額: {(item.amount ?? 0).toLocaleString()}
  </div>
)}
```

### 4. TanStack Query 錯誤處理整合

**決策**：利用 TanStack Query 的內建錯誤處理機制，而非自行實作。

**理由**：
- **自動重試**：TanStack Query 提供內建的重試邏輯
- **錯誤狀態管理**：`isError`, `error` 等狀態自動管理
- **樂觀更新**：失敗時自動回滾，無需手動處理

**實作模式**：
```typescript
const { data, isError, error, refetch } = useFullDashboardData(6)

if (isError) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-red-600 text-lg font-semibold">
          載入儀表板數據時發生錯誤
        </p>
        <p className="text-gray-500 mt-2">{error?.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          重新載入
        </button>
      </div>
    </div>
  )
}
```

## Implementation Patterns

### Pattern 1: Nullish Coalescing for Default Values

**使用場景**：當數值可能為 `null` 或 `undefined`，需要提供預設值。

**實作**：
```typescript
// ✅ 推薦
const displayValue = value ?? 0

// ❌ 不推薦（會將 0 視為 falsy）
const displayValue = value || 0
```

### Pattern 2: Optional Chaining for Nested Properties

**使用場景**：存取深層嵌套的物件屬性。

**實作**：
```typescript
// ✅ 推薦
const customerName = contract?.customer?.company_name_zh ?? '未知客戶'

// ❌ 不推薦（冗長且容易出錯）
const customerName = contract && contract.customer && contract.customer.company_name_zh
  ? contract.customer.company_name_zh
  : '未知客戶'
```

### Pattern 3: Type Guards for Runtime Validation

**使用場景**：需要在執行時驗證資料類型。

**實作**：
```typescript
function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

const formatSafeAmount = (amount: unknown): string => {
  const validAmount = isValidAmount(amount) ? amount : 0
  return validAmount.toLocaleString()
}
```

### Pattern 4: TanStack Query Select Transform

**使用場景**：在查詢層級標準化資料格式。

**實作**：
```typescript
export function useOverdueContracts() {
  return useQuery({
    queryKey: ['contracts', 'overdue'],
    queryFn: fetchOverdueContracts,
    select: (data) => data.map(contract => ({
      ...contract,
      // 確保 amount 永遠是數字
      next_collection_amount: contract.next_collection_amount ?? 0,
      // 確保日期是有效的 ISO 字串
      next_collection_date: contract.next_collection_date ?? new Date().toISOString(),
    })),
  })
}
```

## Performance Considerations

### 1. Nullish Coalescing 效能

**效能影響**：✅ 無影響
- 編譯時優化為簡單的條件檢查
- 與手寫 `if` 語句效能相同

### 2. Optional Chaining 效能

**效能影響**：✅ 極小影響
- 編譯為短路求值（short-circuit evaluation）
- 比多層 `&&` 檢查更快

### 3. toLocaleString() 效能

**效能影響**：⚠️ 中等影響
- 每次呼叫都會建立新的 `Intl.NumberFormat` 實例
- **優化建議**：對於頻繁格式化，使用快取的 formatter

**優化實作**：
```typescript
// 建立快取的 formatter
const currencyFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const formatCurrency = (amount: number | undefined | null): string => {
  const validAmount = amount ?? 0
  return `${defaultCurrency} ${currencyFormatter.format(validAmount)}`
}
```

## Security Considerations

### 1. 輸入驗證

**風險**：API 回傳惡意資料可能導致 XSS 或其他攻擊。

**緩解措施**：
- 使用 TypeScript 類型驗證
- 在 API 層進行資料驗證
- 不直接渲染未經驗證的資料

### 2. 錯誤訊息洩漏

**風險**：錯誤訊息可能洩漏敏感資訊（如 API endpoint、內部邏輯）。

**緩解措施**：
```typescript
// ❌ 不要直接顯示原始錯誤
<p>{error.message}</p>

// ✅ 顯示使用者友善的訊息
<p>無法載入資料，請稍後再試</p>

// ✅ 記錄詳細錯誤到監控服務
console.error('API Error:', error)
```

## Testing Strategy

### 1. 單元測試

**測試範圍**：格式化函式、類型檢查函式。

**測試案例**：
```typescript
describe('formatCurrency', () => {
  it('should format valid numbers', () => {
    expect(formatCurrency(1234.56)).toBe('TWD 1,234')
  })

  it('should handle undefined', () => {
    expect(formatCurrency(undefined)).toBe('TWD 0')
  })

  it('should handle null', () => {
    expect(formatCurrency(null)).toBe('TWD 0')
  })

  it('should handle NaN', () => {
    expect(formatCurrency(NaN)).toBe('TWD 0')
  })

  it('should handle negative numbers', () => {
    expect(formatCurrency(-100)).toBe('TWD -100')
  })
})
```

### 2. 整合測試

**測試範圍**：React 組件與 TanStack Query 整合。

**測試案例**：
```typescript
describe('DashboardClient', () => {
  it('should display default values when data is undefined', () => {
    const { getByText } = render(<DashboardClient locale="zh" />)
    expect(getByText('TWD 0')).toBeInTheDocument()
  })

  it('should refetch on error', async () => {
    const { getByText } = render(<DashboardClient locale="zh" />)
    const refetchButton = getByText('重新載入')
    fireEvent.click(refetchButton)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
```

### 3. 端對端測試

**測試範圍**：完整的使用者流程。

**測試案例**：
```typescript
test('Dashboard should handle API failures gracefully', async ({ page }) => {
  // 模擬 API 失敗
  await page.route('**/api/payments/statistics', route => {
    route.fulfill({ status: 500, body: 'Internal Server Error' })
  })

  await page.goto('/zh/dashboard')

  // 驗證錯誤訊息顯示
  await expect(page.getByText('載入儀表板數據時發生錯誤')).toBeVisible()

  // 驗證重新載入按鈕存在
  const refetchButton = page.getByText('重新載入')
  await expect(refetchButton).toBeVisible()
})
```

## Migration Path

### Phase 1: 修復關鍵錯誤（立即）
1. 修復 exchange-rates API 403 錯誤
2. 修復 toLocaleString TypeError

### Phase 2: 加強防禦（1週內）
1. 在所有格式化函式加入 nullish coalescing
2. 在 TanStack Query 的 `select` 中標準化資料

### Phase 3: 優化效能（2週內）
1. 實作 Intl.NumberFormat 快取
2. 減少不必要的重新渲染

### Phase 4: 監控和改進（持續）
1. 整合錯誤追蹤服務（如 Sentry）
2. 建立監控儀表板
3. 定期檢視錯誤日誌

## References

- [TypeScript Nullish Coalescing](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#nullish-coalescing)
- [Next.js 15 Error Handling](https://nextjs.org/docs/15/app/getting-started/error-handling)
- [TanStack Query Error Handling](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)
- [React Defensive Programming](https://medium.com/javascript-scene/handling-null-and-undefined-in-javascript-1500c65d51ae)
