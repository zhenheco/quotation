# payment-terms-full-payment 規格

## 能力概述

在付款期別編輯器中提供「一次付清（100%）」快速選項，簡化建立全額付款期別的流程。

## ADDED Requirements

### Requirement: 付款期別編輯器 MUST 提供「一次付清」快速選項

付款期別編輯器（PaymentTermsEditor）MUST 提供「一次付清（100%）」按鈕，讓使用者快速建立單一 100% 付款期別。

#### Scenario: 點擊「一次付清」按鈕建立 100% 付款期別

```gherkin
Given 使用者在報價單建立頁面
And 付款期別編輯器為空（無任何付款期別）
When 使用者點擊「一次付清（100%）」按鈕
Then 付款期別列表新增一筆記錄
And 期別名稱為「一次付清」
And 付款比例為 100%
And 金額自動計算為報價單總金額
And 到期日為空（待使用者填寫）
```

#### Scenario: 一次付清按鈕清空現有付款期別

```gherkin
Given 使用者在報價單編輯頁面
And 已設定付款期別為「簽約 30%」、「交付 70%」
When 使用者點擊「一次付清（100%）」按鈕
Then 系統顯示確認對話框「這將清空現有付款期別，確定要改為一次付清嗎？」
When 使用者點擊「確定」
Then 現有付款期別被清空
And 新增一筆 100% 付款期別
And 期別名稱為「一次付清」
```

#### Scenario: 一次付清金額自動更新

```gherkin
Given 使用者在報價單建立頁面
And 已點擊「一次付清（100%）」按鈕
And 付款期別金額為 10000 TWD
When 使用者修改報價單明細（如新增產品）
And 報價單總金額變更為 15000 TWD
Then 一次付清的付款期別金額自動更新為 15000 TWD
And 比例保持 100%
```

#### Scenario: 一次付清後可手動調整期別名稱

```gherkin
Given 使用者已點擊「一次付清（100%）」按鈕
And 付款期別名稱為「一次付清」
When 使用者手動修改期別名稱為「簽約後付清」
Then 期別名稱更新為「簽約後付清」
And 比例和金額保持不變
```

---

### Requirement: 一次付清選項 MUST 符合使用者期望

「一次付清」按鈕的行為 MUST 清晰且符合使用者直覺。

#### Scenario: 按鈕位置明顯

```gherkin
Given 使用者在報價單建立頁面
When 查看付款期別編輯器
Then 「一次付清（100%）」按鈕位於編輯器頂部或側邊
And 按鈕樣式與「新增期別」按鈕區分（如不同顏色）
And 按鈕包含圖示（如 ✓ 或 💯）
```

#### Scenario: 按鈕顯示多語系文字

```gherkin
Given 系統語言設定為繁體中文
When 查看付款期別編輯器
Then 按鈕顯示「一次付清（100%）」
When 切換系統語言為英文
Then 按鈕顯示 "Full Payment (100%)"
```

#### Scenario: 按鈕提供 tooltip 說明

```gherkin
Given 使用者在報價單建立頁面
When 滑鼠懸停在「一次付清（100%）」按鈕上
Then 顯示 tooltip：「快速建立單一 100% 付款期別」
And tooltip 在 1 秒後顯示
```

---

### Requirement: 一次付清期別 MUST 正確儲存到資料庫

點擊「一次付清」按鈕建立的付款期別 MUST 正確儲存到 `payment_terms` 表。

#### Scenario: 一次付清期別儲存到資料庫

```gherkin
Given 使用者在報價單建立頁面
And 點擊「一次付清（100%）」按鈕
And 填寫到期日為 2025-12-31
And 儲存報價單
When 檢查資料庫 payment_terms 表
Then 有一筆記錄
And term_number = 1
And term_name = "一次付清"（或對應語系的文字）
And percentage = 100
And amount = 報價單總金額
And due_date = 2025-12-31
```

#### Scenario: 一次付清期別可被修改

```gherkin
Given 報價單已儲存一次付清期別
And 到期日為 2025-12-31
When 使用者編輯報價單
And 修改到期日為 2026-01-15
And 儲存報價單
Then 資料庫中的到期日更新為 2026-01-15
And 其他欄位保持不變
```

---

### Requirement: 一次付清選項 MUST 與現有付款期別邏輯相容

「一次付清」功能 MUST 與現有的付款期別驗證和計算邏輯相容。

#### Scenario: 一次付清通過比例總和驗證

```gherkin
Given 使用者建立報價單
And 點擊「一次付清（100%）」按鈕
When 系統驗證付款期別比例總和
Then 驗證通過（總和 = 100%）
And 無錯誤訊息
```

#### Scenario: 一次付清可轉換為分期付款

```gherkin
Given 報價單已設定一次付清（100%）
When 使用者編輯報價單
And 刪除一次付清期別
And 新增兩筆期別：「簽約 30%」、「交付 70%」
And 儲存報價單
Then 報價單的付款期別更新為兩筆分期
And 資料庫中一次付清期別被刪除
```

#### Scenario: 一次付清與付款狀態正確聯動

```gherkin
Given 報價單設定一次付清（100%）
And 報價單轉換為合約
When 客戶付款 100%
And 標記付款期別為「已付款」
Then 合約付款狀態為「已完成」
And 無欠款
```
