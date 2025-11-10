# 修復報價單表單欄位映射 - 任務清單

## 階段 1：修正 TypeScript 型別定義（5-10 分鐘）

### Task 1.1：修正 CreateQuotationItemInput 介面
- [x] **檔案**：`hooks/useQuotations.ts:32`
- [x] **動作**：將 `amount: number` 改為 `subtotal: number`
- [x] **驗證**：執行 `npm run typecheck`，確認型別錯誤出現（預期會出現，因為前端還未修正）

### Task 1.2：修正 CreateQuotationInput 介面
- [x] **檔案**：`hooks/useQuotations.ts:43`
- [x] **動作**：將 `total: number` 改為 `total_amount: number`
- [x] **驗證**：執行 `npm run typecheck`，確認型別錯誤數量增加（預期行為）

### Task 1.3：修正 UpdateQuotationInput 介面
- [x] **檔案**：`hooks/useQuotations.ts:57`
- [x] **動作**：將 `total?: number` 改為 `total_amount?: number`
- [x] **驗證**：執行 `npm run typecheck`，記錄所有型別錯誤位置

## 階段 2：修正前端表單（10-15 分鐘）

### Task 2.1：修正報價單總額欄位
- [x] **檔案**：`app/[locale]/quotations/QuotationForm.tsx:287`
- [x] **動作**：
  ```typescript
  // 修改前
  const quotationData = {
    // ...
    total,
    // ...
  }

  // 修改後
  const quotationData = {
    // ...
    total_amount: total,
    // ...
  }
  ```
- [x] **驗證**：執行 `npm run typecheck`，確認此處型別錯誤消失

### Task 2.2：修正項目小計欄位
- [x] **檔案**：`app/[locale]/quotations/QuotationForm.tsx:304`
- [x] **動作**：
  ```typescript
  // 修改前
  items: items.map((item) => ({
    product_id: item.product_id || undefined,
    description: { ... },
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount: item.discount,
    amount: item.subtotal,
  }))

  // 修改後
  items: items.map((item) => ({
    product_id: item.product_id || undefined,
    description: { ... },
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount: item.discount,
    subtotal: item.subtotal,
  }))
  ```
- [x] **驗證**：執行 `npm run typecheck`，確認所有型別錯誤消失

## 階段 3：程式碼品質檢查（5 分鐘）

### Task 3.1：執行 TypeScript 檢查
- [x] **指令**：`npx tsc --noEmit`
- [x] **預期結果**：無新增錯誤（既有的錯誤不影響此次修復）
- [x] **失敗處理**：檢查是否有遺漏的欄位名稱修正

### Task 3.2：執行 Lint 檢查
- [ ] **指令**：`npm run lint`（執行中）
- [ ] **預期結果**：無錯誤（或僅有無關的既有警告）
- [ ] **失敗處理**：修正任何新引入的 lint 錯誤

### Task 3.3：執行完整建置
- [ ] **指令**：`npm run build`
- [ ] **預期結果**：建置成功
- [ ] **失敗處理**：檢查建置錯誤日誌，修復任何問題

## 階段 4：功能驗證（10-15 分鐘）

### Task 4.1：準備測試環境
- **動作**：
  1. 啟動開發伺服器：`npm run dev`
  2. 開啟瀏覽器 Chrome DevTools
  3. 開啟 Network 標籤
  4. 開啟 Console 標籤
- **驗證**：確認開發伺服器正常運行

### Task 4.2：測試基本報價單建立
- **步驟**：
  1. 前往 `/zh/quotations/new`
  2. 選擇一個客戶
  3. 新增一個產品項目（數量：1，單價：1000）
  4. 點擊「儲存」
- **驗證**：
  - [ ] Network 標籤顯示 POST `/api/quotations` 回應 200/201
  - [ ] 請求 Payload 包含 `total_amount` 和 `subtotal` 欄位
  - [ ] 成功導向 `/zh/quotations`
  - [ ] 顯示成功訊息
  - [ ] Console 無錯誤訊息

### Task 4.3：驗證資料庫記錄
- **動作**：查詢資料庫最新的報價單記錄
- **驗證**：
  - [ ] `quotations.total_amount` 欄位有值（非 NULL）
  - [ ] `quotation_items.subtotal` 欄位有值（非 NULL）
  - [ ] 數值計算正確（小計 + 稅額 = 總額）

### Task 4.4：測試多項目報價單
- **步驟**：
  1. 前往 `/zh/quotations/new`
  2. 選擇客戶
  3. 新增三個產品項目，設定不同數量和折扣
  4. 點擊「儲存」
- **驗證**：
  - [ ] 所有項目正確儲存
  - [ ] 每個項目的 `subtotal` 計算正確
  - [ ] 總額計算正確

### Task 4.5：測試錯誤處理
- **步驟**：
  1. 前往 `/zh/quotations/new`
  2. 不選擇客戶
  3. 點擊「儲存」
- **驗證**：
  - [ ] 顯示適當的錯誤訊息
  - [ ] 表單保持在當前頁面
  - [ ] Console 有適當的錯誤日誌

## 階段 5：文件更新（5 分鐘）

### Task 5.1：更新診斷報告狀態
- **檔案**：`QUOTATION_FORM_BUG_DIAGNOSIS.md`
- **動作**：在檔案頂部加入修復狀態
- **內容**：
  ```markdown
  > **狀態**：✅ 已修復
  > **修復日期**：[當前日期]
  > **OpenSpec 變更**：fix-quotation-form-field-mapping
  ```

### Task 5.2：記錄修復歷史
- **檔案**：`QUOTATION_FORM_BUG_DIAGNOSIS.md`
- **動作**：更新「修正歷史」表格
- **內容**：新增修復記錄行

## 階段 6：提交變更（選擇性，需使用者確認）

### Task 6.1：準備 Git Commit
- **動作**：暫存所有變更
- **指令**：`git add hooks/useQuotations.ts app/[locale]/quotations/QuotationForm.tsx QUOTATION_FORM_BUG_DIAGNOSIS.md`
- **驗證**：執行 `git status` 確認只有預期的檔案被暫存

### Task 6.2：建立 Commit
- **僅在使用者明確要求時執行**
- **Commit 訊息**：
  ```
  修復：報價單表單欄位映射錯誤

  - 修正 total → total_amount
  - 修正 amount → subtotal
  - 更新 TypeScript 型別定義

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

## 相依性說明

- **Task 1.x → Task 2.x**：必須先修正型別定義，才能在前端修正時獲得正確的型別檢查
- **Task 2.x → Task 3.x**：必須先完成所有程式碼修改，才能執行檢查
- **Task 3.x → Task 4.x**：必須先通過所有檢查，才能進行功能驗證
- **Task 4.x → Task 5.x**：必須先驗證功能正常，才能更新文件

## 平行執行建議

無法平行執行的任務（必須按順序）：
- 階段 1 → 階段 2 → 階段 3 → 階段 4 → 階段 5

可同時進行的任務：
- Task 3.1、3.2、3.3 可在修復完成後一次性執行
- Task 4.2、4.4 可視為獨立的測試案例

## 回滾計畫

如果修復失敗：
1. 執行 `git checkout -- hooks/useQuotations.ts app/[locale]/quotations/QuotationForm.tsx`
2. 執行 `npm run typecheck` 確認回到修復前狀態
3. 重新檢查診斷報告，確認是否有遺漏的問題

## 估計時間

- **最少**：30 分鐘（一切順利）
- **最多**：60 分鐘（需要額外除錯）
- **平均**：40 分鐘
