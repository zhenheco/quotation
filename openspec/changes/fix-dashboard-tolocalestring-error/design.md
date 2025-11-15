# 設計文件：安全數值格式化解決方案

## 架構概述

本設計採用**集中式格式化工具**模式，將所有數值格式化邏輯集中到單一模組中，確保整個應用程式使用一致且安全的格式化方法。

```
┌─────────────────────────────────────────────────────────┐
│                     應用程式層                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Dashboard    │  │ Quotations   │  │ Contracts    │  │
│  │ Components   │  │ Components   │  │ Components   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Formatters     │
                    │  工具模組        │
                    │  (lib/utils)    │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐    ┌──────▼──────┐    ┌─────▼─────┐
    │ safeToL.. │    │ formatCurr..│    │ formatPer.│
    └───────────┘    └─────────────┘    └───────────┘
```

---

## 設計原則

### 1. 單一職責原則 (Single Responsibility)

每個格式化函數只負責一種類型的格式化：
- `safeToLocaleString`: 基礎數值格式化
- `formatCurrency`: 貨幣格式化
- `formatPercentage`: 百分比格式化

### 2. 開放封閉原則 (Open/Closed)

格式化工具對擴展開放，對修改封閉：
- 可透過 options 參數擴展功能
- 不需修改現有程式碼即可支援新需求

### 3. 依賴反轉原則 (Dependency Inversion)

組件依賴於抽象的格式化介面，而非具體實作：
- 組件不直接呼叫 `toLocaleString()`
- 組件依賴於 formatters 模組提供的安全介面

### 4. 防禦性編程 (Defensive Programming)

假設所有輸入都可能是無效的：
- 使用 Nullish Coalescing (`??`) 提供預設值
- 使用 `isFinite()` 檢查數值有效性
- Guard Clauses 提前返回避免錯誤

---

## 技術決策

### 決策 1: 為什麼使用集中式工具模組？

**選項 A: 在每個組件內部實作格式化邏輯**
- ❌ 程式碼重複
- ❌ 難以維護
- ❌ 不一致的錯誤處理

**選項 B: 使用第三方格式化庫（如 numbro、accounting.js）**
- ❌ 增加專案依賴
- ❌ 學習成本
- ❌ Bundle size 增加

**選項 C: 建立自訂的集中式工具模組** ✅
- ✅ 程式碼重用
- ✅ 容易維護
- ✅ 一致的錯誤處理
- ✅ 輕量級（無額外依賴）
- ✅ 完全掌控實作細節

**最終決策**: 選項 C - 建立 `lib/utils/formatters.ts`

---

### 決策 2: 如何處理無效數值？

**選項 A: 拋出錯誤**
```typescript
if (value === undefined) throw new Error('Value is undefined')
```
- ❌ 會中斷應用程式執行
- ❌ 需要在每個呼叫處 try-catch
- ❌ 使用者體驗差

**選項 B: 回傳原始值**
```typescript
return value?.toLocaleString() ?? value
```
- ❌ 可能回傳 undefined 或 null
- ❌ 仍可能導致後續錯誤

**選項 C: 回傳安全的預設值（"0"）** ✅
```typescript
return (value ?? 0).toLocaleString()
```
- ✅ 保證回傳有效字串
- ✅ 應用程式繼續運作
- ✅ 優雅降級

**最終決策**: 選項 C - 回傳 "0" 作為預設值

**理由**:
1. 使用者體驗優先：顯示 0 比顯示錯誤訊息好
2. 防禦性編程：確保函數永遠回傳有效值
3. 符合業界最佳實踐：Optional Chaining + Nullish Coalescing

---

### 決策 3: 是否要支援自訂 locale？

**選項 A: 硬編碼 'zh-TW'**
```typescript
return value.toLocaleString('zh-TW')
```
- ❌ 不具彈性
- ❌ 難以國際化

**選項 B: 從環境變數讀取**
```typescript
const locale = process.env.NEXT_PUBLIC_LOCALE || 'zh-TW'
```
- ❌ 增加複雜度
- ❌ 可能與 next-intl 衝突

**選項 C: 使用固定的 'zh-TW'，但允許透過 options 覆蓋** ✅
```typescript
export function safeToLocaleString(
  value: number | undefined | null,
  options?: Intl.NumberFormatOptions
): string {
  const validValue = value ?? 0
  if (!isFinite(validValue)) return '0'
  return validValue.toLocaleString('zh-TW', options)
}
```
- ✅ 預設使用專案的主要語言
- ✅ 保留擴展性
- ✅ 簡單明確

**最終決策**: 選項 C

**未來擴展**: 如需支援動態 locale，可從 next-intl 讀取當前語言設定

---

### 決策 4: 測試策略

**選項 A: 只測試邊緣情況**
- ❌ 覆蓋率不足
- ❌ 可能遺漏正常情況的問題

**選項 B: 全面測試 + Property-based Testing**
- ❌ 過度工程
- ❌ 執行時間長

**選項 C: 平衡的測試策略** ✅
- ✅ 邊緣情況測試（undefined, null, NaN, Infinity）
- ✅ 正常情況測試（正數、負數、零、小數）
- ✅ 格式驗證測試（檢查輸出格式正確）
- ✅ 目標覆蓋率 90%

**最終決策**: 選項 C

---

## 實作細節

### 1. safeToLocaleString 實作

```typescript
export function safeToLocaleString(
  value: number | undefined | null,
  options?: Intl.NumberFormatOptions
): string {
  // Step 1: 使用 Nullish Coalescing 處理 undefined/null
  const validValue = value ?? 0

  // Step 2: 檢查數值有效性（排除 NaN, Infinity）
  if (!isFinite(validValue)) {
    return '0'
  }

  // Step 3: 使用 Intl API 格式化
  return validValue.toLocaleString('zh-TW', options)
}
```

**關鍵點**:
1. `value ?? 0`: Nullish Coalescing 只處理 null 和 undefined，不會將 0 視為 falsy
2. `isFinite()`: 同時檢查 NaN 和 Infinity
3. `toLocaleString('zh-TW')`: 使用繁體中文格式（千分位逗號）

---

### 2. formatCurrency 實作

```typescript
export function formatCurrency(
  amount: number | undefined | null,
  currency: string = 'TWD'
): string {
  const validAmount = amount ?? 0
  // 重用 safeToLocaleString 確保一致性
  return `${currency} ${safeToLocaleString(validAmount)}`
}
```

**設計考量**:
- **組合而非重複**: 重用 `safeToLocaleString` 避免程式碼重複
- **簡單格式**: 使用 `${currency} ${amount}` 格式，清晰易讀
- **預設幣別**: TWD 作為預設值符合專案需求

**替代方案** (未採用):
```typescript
// 使用 Intl.NumberFormat
new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: currency
}).format(validAmount)
```
**不採用原因**:
- 不同幣別的符號位置不同（如 TWD 在前，USD 在後）
- 當前簡單格式更一致且符合設計需求

---

### 3. formatPercentage 實作

```typescript
export function formatPercentage(
  value: number | undefined | null,
  decimals: number = 1
): string {
  const validValue = value ?? 0

  if (!isFinite(validValue)) {
    return '0%'
  }

  return `${validValue.toFixed(decimals)}%`
}
```

**設計考量**:
- **控制小數位數**: 使用 `toFixed()` 精確控制
- **預設 1 位小數**: 平衡可讀性和精確度
- **一致的錯誤處理**: 與其他函數相同的模式

---

## 組件整合策略

### 階段 1: 更新 CurrencyChart.tsx

**問題位置**: 第 92 行
```typescript
// 舊程式碼（有風險）
{data.currency} {data.value.toLocaleString()}

// 新程式碼（安全）
{data.currency} {safeToLocaleString(data.value)}
```

**整合步驟**:
1. 導入格式化工具
2. 替換不安全的呼叫
3. 測試 Tooltip 顯示

---

### 階段 2: 強化其他圖表組件

**RevenueChart.tsx**:
```typescript
// 更新 formatCurrency 函數
import { formatCurrency as formatCurrencySafe } from '@/lib/utils/formatters'

const formatCurrency = (value: number | undefined | null) => {
  return formatCurrencySafe(value, currency)
}
```

**StatusChart.tsx**:
類似的更新策略

---

## 效能考量

### 1. 函數呼叫開銷

- `safeToLocaleString` 是輕量級函數
- 主要開銷來自 `toLocaleString()`，這是瀏覽器原生 API
- 額外的檢查（`isFinite`）幾乎無開銷

### 2. 記憶體使用

- 無狀態函數，不會產生記憶體洩漏
- 每次呼叫只產生一個字串物件

### 3. 高頻呼叫場景

- **Tooltip 互動**: 使用者 hover 時可能高頻呼叫
- **圖表渲染**: 初始渲染和更新時批量呼叫
- **效能測試**: 確認在 1000+ 次呼叫時無明顯延遲

---

## 錯誤處理和監控

### 1. 執行時錯誤

理論上不應有執行時錯誤，因為：
- 所有輸入都經過驗證
- 使用原生 API 而非自訂邏輯
- 保證回傳有效字串

### 2. 開發時錯誤

- TypeScript 編譯時會捕捉型別錯誤
- ESLint 會警告不當使用

### 3. 監控和日誌

不需要特別的日誌，因為：
- 函數是純函數，無副作用
- 錯誤情況已被優雅處理

---

## 遷移計劃

### 階段 1: 建立工具模組（Week 1）
- [ ] 建立 `lib/utils/formatters.ts`
- [ ] 撰寫測試
- [ ] 文件化

### 階段 2: 更新圖表組件（Week 1）
- [ ] CurrencyChart
- [ ] RevenueChart
- [ ] StatusChart
- [ ] DashboardClient

### 階段 3: 驗證和部署（Week 1）
- [ ] 整合測試
- [ ] 效能測試
- [ ] 部署到 Staging
- [ ] 部署到 Production

---

## 向後相容性

### 現有 API 不變

組件的對外介面保持不變：
- Props 結構不變
- 資料格式不變
- 只有內部實作改變

### 漸進式遷移

可以逐步遷移：
1. 先遷移出問題的 CurrencyChart
2. 再遷移其他圖表組件
3. 最後統一其他數值格式化

---

## 未來擴展

### 1. 支援更多格式化選項

```typescript
export interface FormatOptions {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  useGrouping?: boolean
}

export function safeToLocaleString(
  value: number | undefined | null,
  options?: FormatOptions
): string {
  // 擴展實作
}
```

### 2. 支援大數值處理

對於非常大的數值（如百萬、億），可能需要：
```typescript
export function formatLargeNumber(
  value: number | undefined | null
): string {
  const validValue = value ?? 0
  if (validValue >= 100000000) {
    return `${(validValue / 100000000).toFixed(1)}億`
  }
  if (validValue >= 10000) {
    return `${(validValue / 10000).toFixed(1)}萬`
  }
  return safeToLocaleString(validValue)
}
```

### 3. 整合 i18n

未來可能需要根據 next-intl 的當前 locale 動態格式化：
```typescript
import { useLocale } from 'next-intl'

export function useFormatters() {
  const locale = useLocale()

  return {
    formatCurrency: (amount: number, currency: string) => {
      return formatCurrency(amount, currency, locale)
    }
  }
}
```

---

## 風險和緩解

### 風險 1: 破壞現有功能

**緩解**:
- 完整的回歸測試
- 漸進式遷移
- 保留回滾選項

### 風險 2: 效能問題

**緩解**:
- 效能測試和 benchmark
- 使用 React DevTools Profiler 監控
- 必要時考慮 memoization

### 風險 3: 使用者困惑

**緩解**:
- 顯示 "0" 比顯示錯誤更直覺
- 加入適當的載入狀態指示器
- 如資料真的缺失，應在資料層處理

---

## 成功指標

1. **技術指標**
   - [ ] 無 toLocaleString 錯誤
   - [ ] 測試覆蓋率 >= 90%
   - [ ] TypeScript 編譯無錯誤
   - [ ] 效能無明顯下降

2. **業務指標**
   - [ ] 儀表板載入成功率 100%
   - [ ] 無使用者回報格式化相關問題
   - [ ] 開發者滿意度提升

3. **維護指標**
   - [ ] 格式化相關的 bug 數量降為 0
   - [ ] 新功能開發時可直接使用格式化工具
   - [ ] 程式碼審查時無格式化相關問題

---

## 結論

本設計採用**簡單、安全、可擴展**的原則，通過建立集中式格式化工具模組，從根本上解決 toLocaleString 錯誤問題。設計遵循 SOLID 原則和防禦性編程最佳實踐，確保系統的穩定性和可維護性。
