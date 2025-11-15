# safe-number-formatting Specification

## Purpose
TBD - created by archiving change fix-dashboard-tolocalestring-error. Update Purpose after archive.
## Requirements
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

