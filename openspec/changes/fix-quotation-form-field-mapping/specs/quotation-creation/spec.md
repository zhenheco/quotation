# 報價單建立規格

## MODIFIED Requirements

### Requirement: 前端表單必須使用正確的 API 欄位名稱

報價單建立表單 **MUST** 發送與後端 API 和資料庫 schema 一致的欄位名稱，確保資料能正確儲存。

#### Scenario: 建立報價單時發送正確的總額欄位名稱

**Given** 使用者填寫了完整的報價單表單，包含客戶、項目、金額等資訊
**And** 系統計算出總額為 `1050`（含稅）
**When** 使用者點擊「儲存」按鈕
**Then** 前端應發送 POST 請求到 `/api/quotations`
**And** 請求 body 必須包含 `total_amount: 1050`（而非 `total: 1050`）
**And** 後端能正確解析 `total_amount` 欄位
**And** 資料庫 `quotations.total_amount` 欄位應儲存 `1050`

#### Scenario: 建立報價單項目時發送正確的小計欄位名稱

**Given** 報價單包含一個項目：數量 2，單價 500，折扣 0
**And** 項目小計計算為 `1000`
**When** 使用者儲存報價單
**Then** 前端應在 `items` 陣列中發送
```json
{
  "product_id": "...",
  "description": { ... },
  "quantity": 2,
  "unit_price": 500,
  "discount": 0,
  "subtotal": 1000
}
```
**And** 欄位名稱必須是 `subtotal`（而非 `amount`）
**And** 後端能正確解析 `subtotal` 欄位
**And** 資料庫 `quotation_items.subtotal` 欄位應儲存 `1000`

#### Scenario: 多項目報價單的所有項目小計正確儲存

**Given** 報價單包含三個項目：
  - 項目 1：數量 1，單價 1000，折扣 0，小計 1000
  - 項目 2：數量 2，單價 500，折扣 10，小計 900
  - 項目 3：數量 3，單價 200，折扣 5，小計 570
**When** 使用者儲存報價單
**Then** API 請求的 `items` 陣列應包含三個物件
**And** 每個物件的 `subtotal` 欄位應分別為 `1000`, `900`, `570`
**And** 資料庫應建立三筆 `quotation_items` 記錄
**And** 每筆記錄的 `subtotal` 欄位應正確儲存對應的值

### Requirement: TypeScript 型別定義必須與 API 契約一致

所有與報價單相關的 TypeScript 介面 **MUST** 使用與後端 API 和資料庫 schema 一致的欄位名稱，確保型別系統能在編譯時捕捉欄位名稱錯誤。

#### Scenario: CreateQuotationInput 介面反映正確的欄位名稱

**Given** 開發者檢視 `hooks/useQuotations.ts` 的 `CreateQuotationInput` 介面
**Then** 介面應包含 `total_amount: number` 屬性
**And** 介面不應包含 `total: number` 屬性
**When** 開發者使用錯誤的欄位名稱（如 `total`）
**Then** TypeScript 編譯器應回報型別錯誤

#### Scenario: CreateQuotationItemInput 介面反映正確的欄位名稱

**Given** 開發者檢視 `hooks/useQuotations.ts` 的 `CreateQuotationItemInput` 介面
**Then** 介面應包含 `subtotal: number` 屬性
**And** 介面不應包含 `amount: number` 屬性
**When** 開發者使用錯誤的欄位名稱（如 `amount`）
**Then** TypeScript 編譯器應回報型別錯誤

#### Scenario: UpdateQuotationInput 介面支援更新總額

**Given** 開發者檢視 `hooks/useQuotations.ts` 的 `UpdateQuotationInput` 介面
**Then** 介面應包含可選的 `total_amount?: number` 屬性
**And** 介面不應包含 `total?: number` 屬性
**When** 開發者在更新報價單時使用錯誤的欄位名稱
**Then** TypeScript 編譯器應回報型別錯誤

### Requirement: 資料驗證必須確保必要欄位有效

前端和後端 **SHALL** 驗證報價單資料的完整性，確保 `total_amount` 和項目的 `subtotal` 欄位不是 `undefined`、`null` 或 `NaN`。

#### Scenario: 前端驗證總額欄位有效

**Given** 使用者填寫報價單表單
**When** 系統計算總額
**Then** 計算結果必須是有效的數字（非 `NaN`、`null` 或 `undefined`）
**When** 使用者嘗試儲存報價單
**Then** 如果總額無效，應顯示錯誤訊息「總額計算錯誤」
**And** 不應發送 API 請求

#### Scenario: 前端驗證項目小計有效

**Given** 使用者新增報價單項目
**When** 系統計算項目小計
**Then** 計算結果必須是有效的數字（非 `NaN`、`null` 或 `undefined`）
**When** 使用者嘗試儲存包含無效小計的報價單
**Then** 應顯示錯誤訊息「項目金額計算錯誤」
**And** 不應發送 API 請求

#### Scenario: 後端驗證接收到有效的總額

**Given** 後端 API 接收到建立報價單的請求
**When** 解析請求 body 的 `total_amount` 欄位
**Then** 如果 `total_amount` 是 `undefined`、`null` 或非數字
**Then** 應回傳 400 錯誤
**And** 錯誤訊息應為「total_amount 欄位是必要的且必須是有效數字」

#### Scenario: 後端驗證接收到有效的項目小計

**Given** 後端 API 接收到建立報價單的請求
**When** 解析 `items` 陣列中每個項目的 `subtotal` 欄位
**Then** 如果任何項目的 `subtotal` 是 `undefined`、`null` 或非數字
**Then** 應回傳 400 錯誤
**And** 錯誤訊息應為「項目 {index} 的 subtotal 欄位是必要的且必須是有效數字」

### Requirement: 錯誤訊息必須清楚指出欄位問題

當欄位名稱錯誤或資料無效時，系統 **SHALL** 提供清楚的錯誤訊息，幫助開發者快速定位問題。

#### Scenario: API 回報缺少必要欄位的錯誤

**Given** 前端發送的請求缺少 `total_amount` 欄位
**When** 後端 API 處理請求
**Then** 應回傳 400 錯誤
**And** 錯誤訊息應包含「缺少必要欄位：total_amount」
**And** 回應 body 應包含 `{ error: "缺少必要欄位：total_amount", code: "MISSING_FIELD" }`

#### Scenario: Console 記錄請求資料以協助除錯

**Given** 前端發送報價單建立請求失敗
**When** catch block 捕獲錯誤
**Then** 應在 console 記錄錯誤訊息
**And** 應在 console 記錄完整的請求資料（`quotationData`）
**And** 開發者能在瀏覽器 DevTools 中查看詳細的錯誤資訊

## References

- 相關規格：`database-integration` - 定義資料庫 schema
- 診斷報告：`QUOTATION_FORM_BUG_DIAGNOSIS.md` - 詳細的問題分析
- 參考實作：`app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx` - 已正確實作的編輯表單

## Implementation Notes

### 前端修改要點

1. **QuotationForm.tsx**：
   - 第 287 行：`total` → `total_amount: total`
   - 第 304 行：`amount: item.subtotal` → `subtotal: item.subtotal`
   - 加強錯誤日誌，記錄請求資料

2. **useQuotations.ts**：
   - 第 32 行：`amount: number` → `subtotal: number`
   - 第 43 行：`total: number` → `total_amount: number`
   - 第 57 行：`total?: number` → `total_amount?: number`

### 後端修改要點

後端 API (`app/api/quotations/route.ts`) 無需修改，因為：
- 第 72-83 行已正確期望 `total_amount` 和 `subtotal`
- 第 86-99 行的驗證邏輯可以改進，但不是本次修復的必要部分
- 第 106-119 行的資料庫插入邏輯正確

### 驗證檢查清單

修復完成後必須確認：
- [ ] TypeScript 編譯無錯誤（`npm run typecheck`）
- [ ] Lint 檢查無錯誤（`npm run lint`）
- [ ] 建置成功（`npm run build`）
- [ ] 手動測試建立基本報價單成功
- [ ] 手動測試建立多項目報價單成功
- [ ] 資料庫 `quotations.total_amount` 有正確的值
- [ ] 資料庫 `quotation_items.subtotal` 有正確的值
- [ ] 瀏覽器 Console 無錯誤
- [ ] Network 請求顯示 200/201 狀態碼

### 測試資料範例

測試用的報價單資料：
```json
{
  "customer_id": "cust-123",
  "issue_date": "2025-11-10",
  "valid_until": "2025-12-10",
  "currency": "TWD",
  "subtotal": 1000,
  "tax_rate": 0.05,
  "tax_amount": 50,
  "total_amount": 1050,
  "items": [
    {
      "product_id": "prod-456",
      "description": {
        "zh": "測試產品",
        "en": "Test Product"
      },
      "quantity": 1,
      "unit_price": 1000,
      "discount": 0,
      "subtotal": 1000
    }
  ]
}
```

### 回歸風險評估

**低風險**：
- 修改僅涉及欄位名稱，不改變業務邏輯
- 編輯表單已正確實作，可作為參考
- TypeScript 型別系統能捕捉大部分錯誤

**需注意**：
- 確保沒有其他地方使用舊的欄位名稱（`total` 或 `amount`）
- 檢查是否有單元測試或整合測試需要更新
