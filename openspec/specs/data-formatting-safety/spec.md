# data-formatting-safety Specification

## Purpose
TBD - created by archiving change fix-dashboard-errors. Update Purpose after archive.
## Requirements
### Requirement: 防護性資料格式化

所有數值格式化函式 MUST 正確處理 `null`、`undefined` 和無效值，避免執行時錯誤。

#### Scenario: 格式化未定義的金額

**Given** 一個付款提醒物件的 `next_collection_amount` 為 `undefined`
**When** 嘗試顯示金額
**Then** 應顯示預設值（如 "0" 或 "N/A"）
**And** 不應拋出 `TypeError`

#### Scenario: 格式化 null 值

**Given** 一個統計數據的 `amount` 為 `null`
**When** 呼叫 `formatCurrency(amount)`
**Then** 應回傳預設格式化字串
**And** 不應嘗試呼叫 `null.toLocaleString()`

#### Scenario: 格式化有效數值

**Given** 一個有效的數值 `1234.56`
**When** 呼叫格式化函式
**Then** 應正確格式化為 "TWD 1,234.56" 或類似格式
**And** 保持原有功能不變

### Requirement: AlertCard 金額顯示 MUST 使用 nullish coalescing 防護

AlertCard 在顯示金額時 MUST 使用 nullish coalescing 運算子（`??`）處理 `undefined` 或 `null` 值，提供預設值 0 以防止 TypeError。

#### Scenario: 顯示未定義的金額

**Given** AlertCard 收到一個 item 物件，其中 `amount` 為 `undefined`
**When** 渲染金額顯示區塊
**Then** 應使用預設值 0 進行格式化
**And** 不應拋出 TypeError
**And** 顯示 "金額: 0"

#### Scenario: 顯示 null 金額

**Given** AlertCard 收到一個 item 物件，其中 `amount` 為 `null`
**When** 渲染金額顯示區塊
**Then** 應使用預設值 0 進行格式化
**And** 顯示 "金額: 0"

### Requirement: formatCurrency 函式 MUST 接受可選參數並提供預設值

formatCurrency 函式 MUST 接受 `number | undefined | null` 類型的參數，並使用 nullish coalescing 運算子提供預設值 0。

#### Scenario: 格式化 null 金額

**Given** formatCurrency 函式收到 `null` 作為參數
**When** 執行格式化
**Then** 應使用預設值 0
**And** 回傳格式化字串如 "TWD 0"

#### Scenario: 格式化 undefined 金額

**Given** formatCurrency 函式收到 `undefined` 作為參數
**When** 執行格式化
**Then** 應使用預設值 0
**And** 回傳格式化字串如 "TWD 0"

