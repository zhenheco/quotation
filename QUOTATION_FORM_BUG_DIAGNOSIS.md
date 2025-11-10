# 🔍 報價單表單儲存失敗診斷報告

> **狀態**：✅ 已修復
> **修復日期**：2025-11-10
> **OpenSpec 變更**：fix-quotation-form-field-mapping

## 📋 問題描述

**症狀**：在建立新報價單時，點擊「儲存」按鈕沒有任何反應，報價單無法成功建立。

**發現日期**：2025-11-10

**影響範圍**：報價單建立功能（`/[locale]/quotations/new`）

---

## 🎯 根本原因分析

### 問題 1：前端與後端欄位名稱不匹配

**前端發送的資料結構**（`QuotationForm.tsx:287-304`）：
```typescript
const quotationData = {
  customer_id: formData.customerId,
  issue_date: formData.issueDate,
  valid_until: formData.validUntil,
  currency: formData.currency,
  subtotal,
  tax_rate: parseFloat(formData.taxRate),
  tax_amount: taxAmount,
  total,                             // ❌ 欄位名稱錯誤
  notes: formData.notes ? {...} : undefined,
  items: items.map((item) => ({
    ...
    amount: item.subtotal,           // ❌ 欄位名稱錯誤
  }))
}
```

**後端 API 期望的資料結構**（`app/api/quotations/route.ts:72-83`）：
```typescript
const {
  customer_id,
  issue_date,
  valid_until,
  currency,
  subtotal,
  tax_rate,
  tax_amount,
  total_amount,             // ✅ 期望 total_amount
  notes,
  items                     // items 內期望 subtotal 欄位
} = body
```

**資料庫插入時期望的欄位**（`app/api/quotations/route.ts:129`）：
```typescript
await createQuotationItem(quotation.id, user.id, {
  product_id: item.product_id || undefined,
  quantity: parseFloat(item.quantity),
  unit_price: parseFloat(item.unit_price),
  discount: parseFloat(item.discount || 0),
  subtotal: parseFloat(item.subtotal),  // ✅ 期望 subtotal
})
```

### 問題 2：TypeScript 型別定義不一致

**型別定義**（`hooks/useQuotations.ts:26-46`）：
```typescript
export interface CreateQuotationItemInput {
  product_id?: string
  description: BilingualText
  quantity: number
  unit_price: number
  discount: number
  amount: number              // ❌ 型別定義使用 amount
}

export interface CreateQuotationInput {
  customer_id: string
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number               // ❌ 型別定義使用 total
  notes?: BilingualText
  items: CreateQuotationItemInput[]
}
```

**實際資料庫 Schema 期望**：
- `quotations.total_amount` （而非 `total`）
- `quotation_items.subtotal` （而非 `amount`）

---

## 🐛 欄位不匹配詳細對照表

| 層級 | 前端/型別定義 | 後端/資料庫 | 狀態 | 影響等級 |
|------|--------------|------------|------|---------|
| 報價單總額 | `total` | `total_amount` | ❌ 不匹配 | **P0 - 嚴重** |
| 項目小計 | `amount` | `subtotal` | ❌ 不匹配 | **P0 - 嚴重** |
| 報價單小計 | `subtotal` | `subtotal` | ✅ 匹配 | - |
| 稅額 | `tax_amount` | `tax_amount` | ✅ 匹配 | - |

---

## 🔄 錯誤流程追蹤

1. **用戶操作**：填寫報價單表單，點擊「儲存」
2. **前端處理**：`QuotationForm.tsx:262` `handleSubmit` 函數被觸發
3. **資料準備**：第 279-307 行準備 `quotationData`，使用錯誤的欄位名稱
4. **API 請求**：第 313 行使用 `createQuotation.mutateAsync(quotationData)`
5. **後端接收**：`app/api/quotations/route.ts:72` 解構請求資料
   - `total_amount` = `undefined` （因為前端送的是 `total`）
   - `items[].subtotal` = `undefined` （因為前端送的是 `amount`）
6. **資料驗證**：第 86 行的基本驗證可能通過（因為只檢查 customer_id 等欄位）
7. **資料庫插入**：第 106-119 行嘗試插入報價單
   - `total_amount: parseFloat(total_amount)` → `total_amount: NaN`
8. **錯誤回傳**：資料庫插入失敗，API 回傳 500 錯誤
9. **錯誤處理**：前端 catch block（第 353-358 行）捕獲錯誤
10. **用戶體驗**：顯示錯誤訊息，但可能不夠明確

---

## 📍 需要修正的檔案位置

### 1. QuotationForm.tsx

**檔案**：`/app/[locale]/quotations/QuotationForm.tsx`

**需要修正的位置**：

#### 修正點 1：報價單總額欄位名稱（第 287 行）
```typescript
// ❌ 修正前
const quotationData = {
  // ...
  total,
  // ...
}

// ✅ 修正後
const quotationData = {
  // ...
  total_amount: total,
  // ...
}
```

#### 修正點 2：項目小計欄位名稱（第 304 行）
```typescript
// ❌ 修正前
items: items.map((item) => ({
  product_id: item.product_id || undefined,
  description: {...},
  quantity: item.quantity,
  unit_price: item.unit_price,
  discount: item.discount,
  amount: item.subtotal,
}))

// ✅ 修正後
items: items.map((item) => ({
  product_id: item.product_id || undefined,
  description: {...},
  quantity: item.quantity,
  unit_price: item.unit_price,
  discount: item.discount,
  subtotal: item.subtotal,
}))
```

### 2. useQuotations.ts

**檔案**：`/hooks/useQuotations.ts`

**需要修正的型別定義**：

#### 修正點 1：CreateQuotationItemInput（第 32 行）
```typescript
// ❌ 修正前
export interface CreateQuotationItemInput {
  product_id?: string
  description: BilingualText
  quantity: number
  unit_price: number
  discount: number
  amount: number
}

// ✅ 修正後
export interface CreateQuotationItemInput {
  product_id?: string
  description: BilingualText
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}
```

#### 修正點 2：CreateQuotationInput（第 43 行）
```typescript
// ❌ 修正前
export interface CreateQuotationInput {
  customer_id: string
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes?: BilingualText
  items: CreateQuotationItemInput[]
}

// ✅ 修正後
export interface CreateQuotationInput {
  customer_id: string
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes?: BilingualText
  items: CreateQuotationItemInput[]
}
```

#### 修正點 3：UpdateQuotationInput（第 57 行）
```typescript
// ❌ 修正前
export interface UpdateQuotationInput {
  customer_id?: string
  issue_date?: string
  valid_until?: string
  status?: QuotationStatus
  currency?: string
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total?: number
  notes?: BilingualText
  items?: CreateQuotationItemInput[]
  payment_status?: PaymentStatus
  payment_due_date?: string
}

// ✅ 修正後
export interface UpdateQuotationInput {
  customer_id?: string
  issue_date?: string
  valid_until?: string
  status?: QuotationStatus
  currency?: string
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total_amount?: number
  notes?: BilingualText
  items?: CreateQuotationItemInput[]
  payment_status?: PaymentStatus
  payment_due_date?: string
}
```

---

## 🔧 修正步驟

### 步驟 1：修正 TypeScript 型別定義

1. 開啟 `hooks/useQuotations.ts`
2. 修正 `CreateQuotationItemInput.amount` → `subtotal`（第 32 行）
3. 修正 `CreateQuotationInput.total` → `total_amount`（第 43 行）
4. 修正 `UpdateQuotationInput.total` → `total_amount`（第 57 行）

### 步驟 2：修正前端表單

1. 開啟 `app/[locale]/quotations/QuotationForm.tsx`
2. 修正第 287 行：`total` → `total_amount: total`
3. 修正第 304 行：`amount: item.subtotal` → `subtotal: item.subtotal`

### 步驟 3：執行 TypeScript 檢查

```bash
npm run typecheck
```

確保沒有引入新的型別錯誤。

### 步驟 4：執行 Lint 檢查

```bash
npm run lint
```

確保程式碼符合規範。

### 步驟 5：功能驗證

1. 啟動開發伺服器：`npm run dev`
2. 開啟瀏覽器 DevTools（Chrome DevTools）
3. 導航至報價單建立頁面：`/zh/quotations/new`
4. 填寫表單資料：
   - 選擇客戶
   - 新增至少一個產品項目
   - 填寫數量和單價
5. 打開 Network 標籤
6. 點擊「儲存」按鈕
7. 觀察：
   - API 請求是否發送成功（200 或 201 狀態碼）
   - 請求 Payload 中是否包含正確的 `total_amount` 和 `subtotal` 欄位
   - 是否成功導向報價單列表頁面
8. 檢查資料庫：
   - 確認 `quotations` 表有新記錄
   - 確認 `total_amount` 欄位有正確的值
   - 確認 `quotation_items` 表有對應的項目記錄

---

## 🧪 測試案例

### 測試案例 1：建立基本報價單

**前提條件**：
- 至少有一個客戶
- 至少有一個產品

**測試步驟**：
1. 前往 `/zh/quotations/new`
2. 選擇客戶
3. 新增一個產品項目（數量：1，單價：1000）
4. 點擊「儲存」

**預期結果**：
- ✅ 成功導向 `/zh/quotations`
- ✅ 顯示成功訊息
- ✅ 報價單列表中出現新建立的報價單
- ✅ 資料庫中 `total_amount` 有正確的值（如 1050，含 5% 稅）

### 測試案例 2：建立多項目報價單

**測試步驟**：
1. 前往 `/zh/quotations/new`
2. 選擇客戶
3. 新增三個產品項目
4. 設定不同的數量和折扣
5. 點擊「儲存」

**預期結果**：
- ✅ 所有項目的 `subtotal` 正確儲存
- ✅ 總額計算正確

### 測試案例 3：錯誤處理

**測試步驟**：
1. 前往 `/zh/quotations/new`
2. 不選擇客戶
3. 點擊「儲存」

**預期結果**：
- ✅ 顯示「請選擇客戶」錯誤訊息
- ✅ 表單保持在當前頁面

---

## 📝 其他發現

### 1. 報價單編輯表單已正確使用欄位名稱

**檔案**：`app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx`

該檔案在第 377 行已正確使用 `total_amount`，顯示此問題僅存在於建立表單。

### 2. 產品表單運作正常

**檔案**：`app/[locale]/products/ProductForm.tsx`

該表單的儲存功能正常，因為：
- 欄位名稱與 API 完全匹配
- TypeScript 型別定義正確
- 使用 React Query 的 `mutateAsync` 正確處理回應

### 3. 錯誤處理可以改進

雖然 `QuotationForm.tsx` 有錯誤處理（第 353-358 行），但可以加入更詳細的日誌來幫助除錯：

```typescript
catch (err) {
  console.error('Error saving quotation:', err)
  console.error('Request data:', quotationData)  // 加入這行來除錯
  const errorMessage = err instanceof Error ? err.message : '儲存報價單失敗'
  setError(errorMessage)
  toast.error(errorMessage)
}
```

---

## ✅ 修正優先級

| 優先級 | 項目 | 理由 | 預估時間 |
|-------|------|------|---------|
| **P0** | 修正 `total` → `total_amount` | 阻礙報價單建立的核心功能 | 5 分鐘 |
| **P0** | 修正 `amount` → `subtotal` | 項目資料無法正確儲存 | 5 分鐘 |
| **P0** | 更新 TypeScript 型別定義 | 確保型別安全，防止未來類似錯誤 | 10 分鐘 |
| **P1** | 執行完整測試驗證 | 確保修正有效 | 15 分鐘 |
| **P2** | 加強錯誤日誌 | 改善開發體驗，方便未來除錯 | 5 分鐘 |

**總預估時間**：40 分鐘

---

## 🚀 建議的後續改進

### 1. 加入端到端測試

使用 Playwright 或 Cypress 為報價單建立流程新增 E2E 測試，自動化驗證此功能。

### 2. 統一命名規範

檢查整個專案，確保所有表單的欄位名稱與 API/資料庫一致。

### 3. 加強型別檢查

考慮使用 Zod 或類似的 schema 驗證庫，在執行時也驗證資料結構。

### 4. API 回應格式標準化

確保所有 API 錯誤回應都包含：
- `error`: 錯誤訊息
- `code`: 錯誤代碼
- `details`: 詳細資訊（如欄位驗證錯誤）

---

## 📊 影響範圍評估

### 受影響的功能
- ✅ 報價單建立（已識別）
- ⚠️ 可能影響報價單更新（需要檢查）
- ⚠️ 可能影響報價單複製功能（需要檢查）

### 不受影響的功能
- ✅ 報價單列表
- ✅ 報價單查看
- ✅ 報價單刪除
- ✅ 報價單匯出
- ✅ 產品管理
- ✅ 客戶管理

---

## 📞 聯絡資訊

**診斷執行者**：Claude Code
**診斷日期**：2025-11-10
**報告版本**：1.0

---

## 🔄 修正歷史

| 日期 | 版本 | 修正內容 | 執行者 |
|------|------|---------|--------|
| 2025-11-10 | 1.0 | 初始診斷報告建立 | Claude Code |

