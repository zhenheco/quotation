# 修復儀表板 toLocaleString 錯誤

## 概述

修復儀表板圖表組件中出現的 "Cannot read properties of undefined (reading 'toLocaleString')" 錯誤，通過實作完整的數值安全處理機制，確保所有數值格式化操作都能正確處理 undefined、null 等邊緣情況。

## 問題描述

### 當前問題

1. **錯誤訊息**：`Cannot read properties of undefined (reading 'toLocaleString')`
2. **發生位置**：
   - `CurrencyChart.tsx` 第 92 行：`data.value.toLocaleString()`
   - 其他圖表組件可能存在類似風險
3. **根本原因**：
   - 資料載入時可能出現 undefined 值
   - 未對數值進行充分的驗證和預設值處理
   - 直接呼叫 toLocaleString() 而未檢查值是否存在

### 影響範圍

- 儀表板頁面無法正常顯示
- 圖表組件渲染失敗
- 使用者體驗嚴重受損

## 解決方案

### 採用的最佳實踐（基於 2025 年標準）

根據網路搜尋和 Stack Overflow 最佳實踐，本方案將採用以下策略：

1. **Optional Chaining & Nullish Coalescing**
   - 使用 `?.` 和 `??` 安全存取屬性
   - 為所有數值提供合理的預設值（通常為 0）

2. **統一的格式化工具函數**
   - 建立 `utils/formatters.ts` 集中處理數值格式化
   - 確保所有格式化邏輯一致且安全

3. **資料驗證層**
   - 在資料進入組件前進行驗證
   - 確保資料結構符合預期

4. **防禦性編程**
   - Guard Clauses：提前返回避免錯誤傳播
   - 型別檢查：確保資料類型正確

## 技術實作

### 1. 建立統一的格式化工具

建立 `lib/utils/formatters.ts`：

```typescript
/**
 * 安全的數值格式化工具
 * 處理 undefined、null、NaN 等邊緣情況
 */

export function safeToLocaleString(
  value: number | undefined | null,
  options?: Intl.NumberFormatOptions
): string {
  const validValue = value ?? 0
  if (!isFinite(validValue)) return '0'
  return validValue.toLocaleString('zh-TW', options)
}

export function formatCurrency(
  amount: number | undefined | null,
  currency: string = 'TWD'
): string {
  const validAmount = amount ?? 0
  return `${currency} ${safeToLocaleString(validAmount)}`
}

export function formatPercentage(
  value: number | undefined | null,
  decimals: number = 1
): string {
  const validValue = value ?? 0
  if (!isFinite(validValue)) return '0%'
  return `${validValue.toFixed(decimals)}%`
}
```

### 2. 更新圖表組件

#### CurrencyChart.tsx
- 替換所有直接使用 `toLocaleString()` 的地方
- 使用 `safeToLocaleString()` 或 `formatCurrency()`
- 特別處理 Tooltip 中的數值顯示

#### RevenueChart.tsx
- 強化現有的 `formatCurrency` 函數
- 確保 Tooltip 和 Y 軸格式化器都使用安全方法

#### StatusChart.tsx
- 更新 `formatCurrency` 函數
- 確保狀態摘要卡片中的數值格式化安全

### 3. 資料驗證

在 `useAnalytics` hook 中加入資料驗證：

```typescript
// 確保數值欄位都有預設值
const sanitizeData = (data: unknown) => ({
  ...data,
  value: data?.value ?? 0,
  revenue: data?.revenue ?? 0,
  count: data?.count ?? 0,
})
```

## 預期效果

1. **完全消除 toLocaleString 錯誤**
   - 所有數值操作都經過安全檢查
   - 不會再出現 undefined 讀取錯誤

2. **提升程式碼品質**
   - 統一的格式化邏輯
   - 更好的型別安全
   - 更容易維護和測試

3. **改善使用者體驗**
   - 儀表板穩定顯示
   - 即使資料不完整也能優雅降級

4. **防止未來類似問題**
   - 建立了標準的數值處理模式
   - 其他開發者可以遵循相同模式

## 測試策略

1. **單元測試**
   - 測試格式化工具函數處理各種邊緣情況
   - 包括 undefined、null、NaN、Infinity 等

2. **整合測試**
   - 測試圖表組件在資料不完整時的行為
   - 驗證 Tooltip 和其他互動元素

3. **手動測試**
   - 在實際環境中測試儀表板
   - 使用 Chrome DevTools 監控錯誤

## 回滾計劃

如果出現問題：
1. 保留原始格式化函數作為備用
2. 使用 Git 回滾到變更前版本
3. 修正問題後重新部署

## 參考資料

- [Stack Overflow - Cannot read properties of undefined (reading 'toLocaleString')](https://stackoverflow.com/questions/69485601/typeerror-cannot-read-properties-of-undefined-reading-tolocalestring)
- [React Best Practices for Handling Undefined Values](https://react.dev/learn/conditional-rendering)
- [TypeScript Optional Chaining](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#optional-chaining)

## 時程規劃

- **Phase 1**（1 小時）：建立格式化工具函數和測試
- **Phase 2**（2 小時）：更新所有圖表組件
- **Phase 3**（1 小時）：測試和驗證
- **Total**：約 4 小時

## 風險評估

**低風險**：
- 變更範圍明確且有限
- 使用業界標準最佳實踐
- 有完整的測試覆蓋

**緩解措施**：
- 分階段實作和測試
- 保留回滾選項
- 充分的程式碼審查
