# Spec: quotation-price-autofill

## ADDED Requirements

### Requirement: 報價單選擇產品自動帶入單價

當使用者在報價單表單中選擇產品時，系統 MUST 自動從產品的 `base_price` 欄位帶入 `unit_price`，並重新計算小計。

#### Scenario: 選擇產品自動帶入價格
```gherkin
Given 使用者在報價單建立/編輯頁面
And 已新增一個行項目
When 使用者從產品下拉選單選擇「產品 A」
And 產品 A 的 base_price 為 1000 TWD
Then unit_price 欄位自動填入 1000
And 根據 quantity 重新計算 subtotal
```

#### Scenario: 自動帶入價格後重新計算小計
```gherkin
Given 使用者選擇產品「產品 B」
And 產品 B 的 base_price 為 500 USD
And quantity 欄位值為 3
And discount 欄位值為 100
When 系統自動帶入 unit_price = 500
Then subtotal 計算為 (3 * 500 - 100) = 1400
And 顯示在 subtotal 欄位
```

#### Scenario: 允許使用者手動修改自動帶入的單價
```gherkin
Given 系統已自動帶入 unit_price = 1000
When 使用者手動修改 unit_price 為 1200
Then unit_price 欄位顯示 1200
And subtotal 根據新的 unit_price 重新計算
And 不再自動覆蓋使用者的修改
```

#### Scenario: 產品沒有基本價格時的處理
```gherkin
Given 使用者選擇產品「產品 C」
And 產品 C 的 base_price 為 null 或 undefined
When 系統嘗試自動帶入價格
Then unit_price 欄位保持 0 或空白
And 不顯示錯誤訊息
And 允許使用者手動輸入價格
```

#### Scenario: 切換產品時更新價格
```gherkin
Given 行項目已選擇產品 A（base_price = 1000）
And unit_price 已自動帶入為 1000
When 使用者切換選擇產品 B（base_price = 2000）
Then unit_price 更新為 2000
And subtotal 根據新價格重新計算
```

---

### Requirement: 從產品資料載入價格

系統 MUST 從 `useProducts` hook 取得的產品列表中正確讀取 `base_price`。

#### Scenario: 正確讀取產品 base_price
```gherkin
Given products 列表已從 API 載入
And 產品資料包含以下欄位：
  | 欄位 | 類型 | 說明 |
  | id | string | 產品 ID |
  | name | BilingualText | 產品名稱 |
  | base_price | number | 基本價格 |
  | base_currency | string | 基本幣別 |
When 使用者選擇產品
Then 系統從對應產品物件讀取 base_price
And 將 base_price 填入 unit_price 欄位
```

#### Scenario: 處理 API 回傳的欄位對應
```gherkin
Given API 可能回傳 base_price 或 unit_price 欄位
When 前端接收產品資料
Then 優先使用 base_price 欄位
And 如果 base_price 不存在，使用 unit_price
And 確保欄位對應一致性
```

---

### Requirement: 小計自動重新計算

當 quantity、unit_price 或 discount 變更時，系統 MUST 自動重新計算 subtotal。

#### Scenario: 變更數量時重新計算
```gherkin
Given unit_price = 500, quantity = 2, discount = 0
When 使用者將 quantity 改為 5
Then subtotal 自動更新為 (5 * 500 - 0) = 2500
```

#### Scenario: 變更折扣時重新計算
```gherkin
Given unit_price = 1000, quantity = 3, discount = 0
When 使用者輸入 discount = 500
Then subtotal 自動更新為 (3 * 1000 - 500) = 2500
```

#### Scenario: 處理無效輸入
```gherkin
Given 使用者輸入非數字的 quantity 或 unit_price
When 系統解析輸入值
Then 使用 parseFloat() 或預設為 0
And subtotal 不顯示 NaN
```

---

### Requirement: 使用者體驗優化

自動帶入價格的功能 MUST 符合使用者預期，不造成困擾。

#### Scenario: 視覺化回饋
```gherkin
Given 使用者選擇產品
When unit_price 自動填入
Then 欄位短暫高亮顯示（可選）
And 使用者可立即看到變更
```

#### Scenario: 保留手動輸入的值
```gherkin
Given 使用者手動修改過 unit_price
When 使用者再次選擇相同產品
Then unit_price 保持使用者手動輸入的值
And 不自動覆蓋（可選功能）
```

## MODIFIED Requirements
無

## REMOVED Requirements
無
