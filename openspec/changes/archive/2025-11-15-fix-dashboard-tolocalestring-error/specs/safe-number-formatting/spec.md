# 安全數值格式化規格

## 概述

定義系統中所有數值格式化操作的安全處理標準，確保在面對 undefined、null、NaN 等邊緣情況時能正確處理而不會產生執行時錯誤。

---

## ADDED Requirements

### Requirement: 系統 MUST 提供統一的安全數值格式化工具

系統 SHALL 提供一套標準化的格式化工具函數，確保所有數值操作都經過安全檢查，能正確處理各種邊緣情況。

#### Scenario: 格式化 undefined 數值

**Given** 一個 undefined 數值
**When** 呼叫 `safeToLocaleString(undefined)`
**Then** 應回傳 `"0"` 而不是拋出錯誤

**Given** 一個 undefined 金額
**When** 呼叫 `formatCurrency(undefined, 'TWD')`
**Then** 應回傳 `"TWD 0"` 而不是拋出錯誤

#### Scenario: 格式化 null 數值

**Given** 一個 null 數值
**When** 呼叫 `safeToLocaleString(null)`
**Then** 應回傳 `"0"` 而不是拋出錯誤

**Given** 一個 null 金額
**When** 呼叫 `formatCurrency(null, 'USD')`
**Then** 應回傳 `"USD 0"` 而不是拋出錯誤

#### Scenario: 格式化 NaN 數值

**Given** 一個 NaN 數值
**When** 呼叫 `safeToLocaleString(NaN)`
**Then** 應回傳 `"0"` 而不是 `"NaN"`

**Given** 一個 NaN 百分比
**When** 呼叫 `formatPercentage(NaN)`
**Then** 應回傳 `"0.0%"` 而不是 `"NaN%"`

#### Scenario: 格式化 Infinity 數值

**Given** 一個 Infinity 數值
**When** 呼叫 `safeToLocaleString(Infinity)`
**Then** 應回傳 `"0"` 而不是 `"∞"`

**Given** 一個負 Infinity 金額
**When** 呼叫 `formatCurrency(-Infinity, 'EUR')`
**Then** 應回傳 `"EUR 0"` 而不是 `"EUR -∞"`

#### Scenario: 格式化正常數值

**Given** 一個正常數值 `1234567.89`
**When** 呼叫 `safeToLocaleString(1234567.89)`
**Then** 應回傳 `"1,234,567.89"` 使用繁體中文格式

**Given** 一個正常金額 `50000`
**When** 呼叫 `formatCurrency(50000, 'TWD')`
**Then** 應回傳 `"TWD 50,000"`

#### Scenario: 格式化百分比

**Given** 一個百分比數值 `12.3456`
**When** 呼叫 `formatPercentage(12.3456, 1)`
**Then** 應回傳 `"12.3%"`

**Given** 一個百分比數值 `98.7654`
**When** 呼叫 `formatPercentage(98.7654, 2)`
**Then** 應回傳 `"98.77%"`

---

### Requirement: 圖表組件 MUST 使用安全的數值格式化方法

所有圖表組件（RevenueChart、CurrencyChart、StatusChart）SHALL 使用統一的安全格式化工具，MUST NOT 直接呼叫 `toLocaleString()` 而未檢查數值有效性。

#### Scenario: CurrencyChart Tooltip 顯示安全格式化數值

**Given** CurrencyChart 收到包含 undefined value 的資料
**When** 使用者 hover 到該區域觸發 Tooltip
**Then** Tooltip 應顯示 `"0"` 而不是拋出錯誤
**And** 應用程式應繼續正常運作

#### Scenario: RevenueChart Y 軸顯示安全格式化數值

**Given** RevenueChart 收到包含 null revenue 的資料點
**When** 圖表渲染 Y 軸刻度
**Then** Y 軸應正確顯示格式化的數值
**And** 不應出現 "NaN" 或錯誤訊息

#### Scenario: StatusChart 摘要卡片顯示安全格式化金額

**Given** StatusChart 收到某個狀態的 value 為 undefined
**When** 渲染狀態摘要卡片
**Then** 摘要卡片應顯示 `"TWD 0"` 或對應幣別的零值
**And** 卡片應正常渲染其他資訊

---

### Requirement: 格式化工具 MUST 支援多語言和多幣別

格式化工具 SHALL 能正確處理不同的語言地區設定和各種幣別代碼。

#### Scenario: 使用繁體中文格式化數值

**Given** 系統語言設定為繁體中文
**When** 呼叫 `safeToLocaleString(1000000)`
**Then** 應回傳 `"1,000,000"` 使用繁體中文千分位格式

#### Scenario: 支援多種幣別

**Given** 各種幣別代碼（TWD, USD, EUR, JPY 等）
**When** 呼叫 `formatCurrency(amount, currency)`
**Then** 應正確顯示對應的幣別符號或代碼

**Example**:
- `formatCurrency(1000, 'TWD')` → `"TWD 1,000"`
- `formatCurrency(1000, 'USD')` → `"USD 1,000"`
- `formatCurrency(1000, 'EUR')` → `"EUR 1,000"`

---

### Requirement: 格式化工具 MUST 具備完整的 TypeScript 型別定義

所有格式化函數 SHALL 有明確的型別定義，MUST 確保編譯時期的型別安全。

#### Scenario: TypeScript 型別檢查通過

**Given** 開發者使用格式化工具函數
**When** 傳入正確型別的參數
**Then** TypeScript 編譯器應無錯誤

**Given** 開發者傳入錯誤型別的參數
**When** TypeScript 編譯
**Then** 應顯示明確的型別錯誤訊息

#### Scenario: 函數參數型別定義

**Given** `safeToLocaleString` 函數
**Then** 應接受 `number | undefined | null` 作為第一個參數
**And** 應接受可選的 `Intl.NumberFormatOptions` 作為第二個參數
**And** 應回傳 `string` 型別

---

### Requirement: 系統 MUST 提供格式化工具的測試覆蓋

格式化工具 SHALL 有完整的測試覆蓋，MUST 包括所有邊緣情況和正常情況。

#### Scenario: 測試覆蓋所有邊緣情況

**Given** 格式化工具的測試套件
**Then** 應包含測試處理 undefined 的情況
**And** 應包含測試處理 null 的情況
**And** 應包含測試處理 NaN 的情況
**And** 應包含測試處理 Infinity 的情況
**And** 應包含測試處理負數的情況
**And** 應包含測試處理零的情況
**And** 應包含測試處理正常數值的情況

#### Scenario: 測試覆蓋率達標

**Given** 格式化工具的測試執行結果
**When** 產生覆蓋率報告
**Then** 程式碼覆蓋率應 >= 90%
**And** 所有公開函數都應有測試
**And** 所有分支都應有測試覆蓋

---

## 技術規範

### 函數簽名

```typescript
/**
 * 安全地將數值轉換為本地化字串格式
 * @param value - 要格式化的數值（可為 undefined 或 null）
 * @param options - Intl.NumberFormat 選項
 * @returns 格式化後的字串，如果輸入無效則回傳 "0"
 */
export function safeToLocaleString(
  value: number | undefined | null,
  options?: Intl.NumberFormatOptions
): string

/**
 * 格式化貨幣金額
 * @param amount - 金額（可為 undefined 或 null）
 * @param currency - 幣別代碼（預設 'TWD'）
 * @returns 格式化後的貨幣字串
 */
export function formatCurrency(
  amount: number | undefined | null,
  currency?: string
): string

/**
 * 格式化百分比
 * @param value - 百分比數值（可為 undefined 或 null）
 * @param decimals - 小數位數（預設 1）
 * @returns 格式化後的百分比字串
 */
export function formatPercentage(
  value: number | undefined | null,
  decimals?: number
): string
```

### 實作要求

1. **使用 Nullish Coalescing**：`value ?? 0`
2. **檢查數值有效性**：`isFinite(value)`
3. **使用繁體中文語系**：`toLocaleString('zh-TW', options)`
4. **防禦性編程**：所有函數都應有 Guard Clauses

### 效能要求

- 格式化操作應在 < 1ms 內完成
- 不應造成記憶體洩漏
- 可被高頻率呼叫（如 Tooltip 互動）

### 相容性要求

- 支援所有現代瀏覽器（Chrome, Firefox, Safari, Edge）
- 支援 Node.js 環境（用於 SSR）
- 遵循 ECMAScript 國際化 API 標準

---

## 測試要求

### 單元測試

每個格式化函數必須有獨立的測試檔案：

```typescript
describe('safeToLocaleString', () => {
  it('should handle undefined', () => {
    expect(safeToLocaleString(undefined)).toBe('0')
  })

  it('should handle null', () => {
    expect(safeToLocaleString(null)).toBe('0')
  })

  it('should handle NaN', () => {
    expect(safeToLocaleString(NaN)).toBe('0')
  })

  it('should handle Infinity', () => {
    expect(safeToLocaleString(Infinity)).toBe('0')
  })

  it('should format normal numbers', () => {
    expect(safeToLocaleString(1234567.89)).toMatch(/1,234,567/)
  })
})
```

### 整合測試

- 測試圖表組件在資料不完整時的行為
- 測試 Tooltip 互動時的數值顯示
- 測試不同語言環境下的格式化結果

---

## 文件要求

1. **JSDoc 註解**：所有公開函數都必須有完整的 JSDoc
2. **使用範例**：提供實際使用範例
3. **最佳實踐指引**：說明何時使用哪個格式化函數
4. **遷移指南**：如何從舊的格式化方式遷移到新工具

---

## 驗收標準

- [ ] 所有格式化函數實作完成
- [ ] TypeScript 型別定義完整
- [ ] 單元測試覆蓋率 >= 90%
- [ ] 整合測試通過
- [ ] 儀表板無 toLocaleString 錯誤
- [ ] 所有圖表正常顯示
- [ ] Lint 和 TypeCheck 通過
- [ ] 文件完整且清晰
