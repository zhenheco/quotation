# payment-method-selection Specification

## Purpose
TBD - created by archiving change quotation-payment-methods. Update Purpose after archive.
## Requirements
### Requirement: 報價單 MUST 支援付款方式選擇

報價單建立和編輯表單中 MUST 提供付款方式選擇器，允許使用者選擇以下其中一種付款方式：

- 現金 (Cash)
- 銀行匯款 (Bank Transfer)
- ACH/電子轉帳 (ACH Transfer)
- 信用卡 (Credit Card)
- 支票 (Check)
- 虛擬幣 (Cryptocurrency)
- 其他 (Other) - 可自訂描述

#### Scenario: 建立報價單時選擇付款方式

```gherkin
Given 使用者在報價單建立頁面
When 使用者填寫報價單基本資訊
Then 頁面顯示「付款方式」選擇器
And 選擇器包含 7 種選項：現金、銀行匯款、ACH 轉帳、信用卡、支票、虛擬幣、其他
And 使用者可選擇其中一個選項
And 付款方式為可選欄位（允許不選擇）
```

#### Scenario: 選擇其他付款方式時的描述輸入

```gherkin
Given 使用者在報價單建立頁面
When 使用者選擇付款方式為「其他」
Then 付款備註欄位自動 focus
And placeholder 顯示「請描述付款方式，例如：分期付款、貨到付款等」
And 使用者可輸入自訂描述
```

#### Scenario: 編輯報價單時修改付款方式

```gherkin
Given 使用者在報價單編輯頁面
And 報價單已有付款方式「現金」
When 使用者將付款方式改為「ACH 轉帳」
And 點擊儲存
Then 報價單的付款方式更新為「ACH 轉帳」
And 更新成功後顯示成功訊息
```

---

### Requirement: 付款期別 MUST 支援付款方式選擇（覆蓋報價單預設值）

付款期別編輯器中每個期別 MUST 可選擇付款方式，覆蓋報價單層級的預設值。

#### Scenario: 付款期別選擇不同的付款方式

```gherkin
Given 報價單的預設付款方式為「銀行匯款」
And 報價單有兩個付款期別：「簽約 30%」和「交付 70%」
When 使用者在第一期選擇付款方式為「ACH 轉帳」
And 第二期不選擇付款方式（保持空白）
And 儲存報價單
Then 第一期的付款方式為「ACH 轉帳」
And 第二期繼承報價單預設值「銀行匯款」
```

#### Scenario: 付款期別顯示繼承的付款方式

```gherkin
Given 報價單的預設付款方式為「信用卡」
And 付款期別沒有選擇付款方式
When 使用者查看付款期別詳情
Then 顯示「付款方式：信用卡（預設）」
And 以不同樣式標示「（預設）」文字（如灰色或斜體）
```

#### Scenario: 付款期別可清除自訂付款方式

```gherkin
Given 付款期別已選擇付款方式為「支票」
And 報價單預設付款方式為「銀行匯款」
When 使用者清除該期別的付款方式選擇
And 儲存報價單
Then 該期別的付款方式重新繼承預設值「銀行匯款」
```

---

### Requirement: 報價單 MUST 支援付款備註輸入

報價單建立和編輯表單中 MUST 提供付款備註文字輸入欄位，允許使用者記錄付款相關資訊（如銀行帳號、支票號碼等）。

#### Scenario: 建立報價單時輸入付款備註

```gherkin
Given 使用者在報價單建立頁面
And 已選擇付款方式為「銀行匯款」
When 使用者在「付款備註」欄位輸入「玉山銀行 808 分行 123-456-789」
And 點擊儲存
Then 報價單的付款備註儲存為「玉山銀行 808 分行 123-456-789」
And 建立成功後顯示成功訊息
```

#### Scenario: 付款備註字數限制

```gherkin
Given 使用者在報價單建立頁面
When 使用者在付款備註欄位輸入超過 500 字元的文字
Then 欄位顯示字數計數器「450/500」
And 超過 500 字元時顯示錯誤訊息「付款備註不得超過 500 字元」
And 儲存按鈕變為禁用狀態
```

#### Scenario: 根據付款方式動態調整 placeholder

```gherkin
Given 使用者在報價單建立頁面
When 使用者選擇付款方式為「銀行匯款」
Then 付款備註 placeholder 為「例如：銀行名稱、分行、帳號等」
When 使用者選擇付款方式為「支票」
Then 付款備註 placeholder 為「例如：支票號碼、到期日等」
When 使用者選擇付款方式為「虛擬幣」
Then 付款備註 placeholder 為「例如：錢包地址、網路（BTC/ETH/USDT）等」
```

---

### Requirement: 資料庫 MUST 儲存付款方式和備註資訊

`quotations` 和 `payment_terms` 表 MUST 新增付款方式欄位，並正確儲存和讀取這些資訊。

#### Scenario: quotations 表包含付款方式和備註欄位

```gherkin
Given 執行資料庫 migration
When 檢查 quotations 表結構
Then 表包含 payment_method 欄位（VARCHAR(50)，NULL）
And 表包含 payment_notes 欄位（TEXT，NULL）
And 欄位允許為 NULL（向下相容）
```

#### Scenario: payment_terms 表包含付款方式欄位

```gherkin
Given 執行資料庫 migration
When 檢查 payment_terms 表結構
Then 表包含 payment_method 欄位（VARCHAR(50)，NULL）
And 欄位允許為 NULL（使用報價單預設值）
```

#### Scenario: API 正確儲存付款資訊

```gherkin
Given 使用者提交建立報價單請求
And 請求包含 payment_method = "ach_transfer"
And 請求包含 payment_notes = "ACH Routing: 123456789"
And 付款期別 1 包含 payment_method = "check"
When API 處理請求
Then 資料庫 quotations 表新增一筆記錄
And quotations.payment_method = "ach_transfer"
And quotations.payment_notes = "ACH Routing: 123456789"
And payment_terms 表包含期別 1
And payment_terms[1].payment_method = "check"
```

#### Scenario: API 正確讀取付款資訊（含繼承邏輯）

```gherkin
Given 資料庫中有一筆報價單記錄
And quotations.payment_method = "bank_transfer"
And quotations.payment_notes = "玉山銀行 123-456"
And 有兩個付款期別
And payment_terms[1].payment_method = "check"
And payment_terms[2].payment_method = NULL
When 前端請求該報價單資料
Then API 回應包含 quotation.payment_method: "bank_transfer"
And API 回應包含 quotation.payment_notes: "玉山銀行 123-456"
And 期別 1 的 effective_payment_method: "check"
And 期別 2 的 effective_payment_method: "bank_transfer"（繼承）
```

---

### Requirement: TypeScript 類型 MUST 包含付款方式和備註

所有相關的 TypeScript interface 和 type MUST 更新以包含新欄位，確保類型安全。

#### Scenario: PaymentMethod 類型定義

```gherkin
Given types/models.ts 檔案
When 檢查類型定義
Then 包含 PaymentMethod type
And PaymentMethod = 'cash' | 'bank_transfer' | 'ach_transfer' | 'credit_card' | 'check' | 'cryptocurrency' | 'other'
```

#### Scenario: Quotation interface 包含新欄位

```gherkin
Given types/models.ts 中的 Quotation interface
When 檢查 interface 定義
Then 包含 payment_method?: PaymentMethod | null
And 包含 payment_notes?: string | null
And 欄位標記為可選（?）
```

#### Scenario: PaymentTerm interface 包含新欄位

```gherkin
Given lib/dal/payment-terms.ts 中的 PaymentTerm interface
When 檢查 interface 定義
Then 包含 payment_method?: PaymentMethod | null
And 欄位標記為可選（?）
```

---

### Requirement: UI MUST 提供清晰的付款方式選擇體驗

付款方式選擇器 MUST 提供清晰的 UI，包含圖示、多語系支援和安全提示。

#### Scenario: 付款方式選擇器顯示圖示和說明

```gherkin
Given 使用者在報價單建立頁面
When 查看付款方式選擇器
Then 每個選項顯示對應圖示和簡短說明
  | 付款方式 | 圖示 | 說明 |
  | 現金 | 💵 | 直接現金交易 |
  | 銀行匯款 | 🏦 | 傳統銀行轉帳 |
  | ACH 轉帳 | ⚡ | 電子自動轉帳 |
  | 信用卡 | 💳 | 信用卡付款 |
  | 支票 | 📝 | 紙本支票付款 |
  | 虛擬幣 | ₿ | 加密貨幣付款 |
  | 其他 | ➕ | 自訂付款方式 |
```

#### Scenario: 付款方式多語系支援

```gherkin
Given 系統語言設定為繁體中文
When 查看付款方式選擇器
Then 選項顯示中文名稱
When 切換系統語言為英文
Then 選項顯示為 "Cash"、"Bank Transfer"、"ACH Transfer" 等
```

#### Scenario: PDF 匯出包含付款資訊

```gherkin
Given 報價單設定付款方式為「ACH 轉帳」
And 付款備註為「Routing: 123456789」
When 使用者匯出報價單為 PDF
Then PDF 包含「付款方式：ACH 轉帳」
And PDF 包含「付款備註：Routing: 123456789」
And 資訊顯示在報價單總計區塊附近
```

