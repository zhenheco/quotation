# Proposal: fix-product-quotation-save-bugs

## Overview
修復產品（服務/品項）建立表單提交無反應，以及報價單新增產品時未自動帶入單價的問題。同時確保所有資料皆從資料庫讀取，移除前端硬編碼和 mock 資料。

## Motivation
目前系統存在以下關鍵問題影響使用者體驗：
1. 建立服務/品項時點擊「儲存」按鈕沒有反應，使用者無法成功建立新產品
2. 在報價單中選擇產品後，單價欄位沒有自動填入產品的基本價格（`base_price`）
3. 部分資料仍使用前端硬編碼或 mock 資料，而非從資料庫動態載入

這些問題嚴重影響系統的可用性和資料一致性，需要立即修復。

## Goals
1. 修復產品表單提交功能，確保點擊「儲存」按鈕能成功建立/更新產品
2. 實作報價單產品選擇時自動帶入單價功能
3. 移除所有前端硬編碼資料，改為從資料庫查詢
4. 確保所有表單送出後能正確更新資料庫
5. 提供適當的錯誤處理和使用者回饋

## Non-Goals
- 不重構整個產品或報價單系統架構
- 不新增產品或報價單的新功能
- 不處理匯率轉換或多幣別計算
- 不實作產品價格歷史記錄

## Scope

### In Scope
1. **產品表單提交修復**：
   - 檢查並修復 `ProductForm.tsx` 的表單送出邏輯
   - 確保 `POST /api/products` API 能正確處理請求
   - 驗證資料庫寫入成功
   - 提供成功/失敗的 toast 通知

2. **報價單自動帶入單價**：
   - 在 `QuotationForm.tsx` 的 `handleItemChange` 函式中實作自動填入邏輯
   - 當使用者選擇產品時，從產品資料中讀取 `base_price`
   - 自動填入 `unit_price` 欄位
   - 自動重新計算小計

3. **移除硬編碼資料**：
   - 檢查所有組件中的硬編碼資料
   - 將硬編碼的客戶、產品、報價單資料改為從 API 載入
   - 確保所有下拉選單選項來自資料庫

4. **資料庫整合**：
   - 確認所有 CRUD 操作正確連接資料庫
   - 驗證 RLS (Row Level Security) 政策正確設定
   - 確保使用者只能存取自己的資料

### Out of Scope
- 產品價格計算公式的重構
- 報價單整體流程優化
- 產品分類系統改進
- 多幣別即時匯率查詢

## Success Criteria
1. 在產品表單點擊「儲存」按鈕後：
   - 表單資料成功送出到 API
   - 資料庫正確寫入新產品記錄
   - 顯示成功 toast 通知
   - 頁面導向產品列表

2. 在報價單表單選擇產品後：
   - `unit_price` 欄位自動填入產品的 `base_price`
   - 小計自動重新計算
   - 使用者可以手動修改自動帶入的單價

3. 資料一致性：
   - 所有列表資料（客戶、產品、報價單）來自資料庫
   - 不存在任何前端 mock 資料或硬編碼選項
   - 資料庫查詢結果正確顯示在 UI

4. 錯誤處理：
   - 表單驗證失敗時顯示明確的錯誤訊息
   - API 錯誤時顯示使用者友善的提示
   - 網路錯誤有適當的重試機制

## Technical Approach

### 1. 產品表單提交修復
- 檢查 `ProductForm.tsx` 的 `handleSubmit` 函式
- 確認 `useCreateProduct` 和 `useUpdateProduct` hooks 正確呼叫
- 驗證 API 端點的 request/response 格式
- 檢查是否有 event.preventDefault() 漏掉

### 2. 報價單自動帶入單價
```typescript
// 在 QuotationForm.tsx 的 handleItemChange 函式中
if (field === 'product_id') {
  const product = products.find(p => p.id === value)
  if (product && product.base_price) {
    newItems[index].unit_price = product.base_price
    // 重新計算小計
    const quantity = parseFloat(newItems[index].quantity.toString()) || 0
    const discount = parseFloat(newItems[index].discount.toString()) || 0
    newItems[index].subtotal = quantity * product.base_price - discount
  }
}
```

### 3. 資料庫欄位對應
- Products 表：使用 `base_price` 而非 `unit_price`
- Quotation Items 表：使用 `unit_price`（來自產品的 `base_price`）
- 確保 API 回傳時正確對應欄位名稱

### 4. 錯誤處理強化
- 使用 try-catch 包裹所有 async 操作
- 使用 toast 提供即時回饋
- 在 console 記錄詳細錯誤資訊以供除錯

## Related Changes
- 此變更建立在現有的產品和報價單系統之上
- 可能影響 `add-quotation-send-button` 變更（確保寄送前資料正確）
- 與資料庫 schema 緊密相關

## Risks and Mitigations
| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 修復表單送出可能影響編輯功能 | 中 | 同時測試新增和編輯場景 |
| 自動帶入單價可能覆蓋使用者手動輸入 | 低 | 只在選擇產品時自動帶入，後續可手動修改 |
| 移除硬編碼可能導致空白畫面 | 高 | 確保資料庫有測試資料，加入載入狀態 |
| RLS 政策可能阻擋合法操作 | 中 | 仔細檢查並測試 RLS 規則 |

## Dependencies
- Supabase 資料庫已正確設定
- 現有的 API 端點（`/api/products`, `/api/quotations`）運作正常
- React Query hooks 正確實作

## Testing Plan
1. **產品建立測試**：
   - 填寫產品表單並送出
   - 驗證資料庫新增記錄
   - 確認產品列表出現新產品

2. **產品編輯測試**：
   - 編輯現有產品
   - 驗證資料庫更新
   - 確認列表顯示更新後的資料

3. **報價單自動帶入測試**：
   - 建立新報價單
   - 選擇產品
   - 驗證單價自動填入
   - 驗證可手動修改單價

4. **資料庫整合測試**：
   - 確認所有列表資料來自資料庫
   - 測試不同使用者只能看到自己的資料
   - 驗證 CRUD 操作都正確反映到資料庫

## Timeline
預估 2-3 天完成：
- Day 1: 修復產品表單送出 + 測試
- Day 2: 實作報價單自動帶入單價 + 移除硬編碼
- Day 3: 整合測試 + 修正問題

## Open Questions
1. 產品價格是否需要考慮幣別轉換？（目前 Non-Goal）
2. 是否需要記錄產品價格變更歷史？（目前 Non-Goal）
3. 報價單中的單價是否應該允許與產品價格不同？（是，允許手動修改）
