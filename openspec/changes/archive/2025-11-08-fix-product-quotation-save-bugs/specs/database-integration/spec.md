# Spec: database-integration

## ADDED Requirements

### Requirement: 移除前端硬編碼資料

所有選單選項和資料列表 MUST 從資料庫動態載入，不得使用前端硬編碼或 mock 資料。

#### Scenario: 產品列表從資料庫載入
```gherkin
Given 使用者開啟產品列表頁面
When 頁面載入
Then 呼叫 GET /api/products
And 顯示資料庫中的所有產品
And 不顯示任何硬編碼的假資料
```

#### Scenario: 客戶列表從資料庫載入
```gherkin
Given 使用者開啟客戶列表頁面
When 頁面載入
Then 呼叫 GET /api/customers
And 顯示資料庫中的所有客戶
And 不顯示任何硬編碼的假資料
```

#### Scenario: 報價單列表從資料庫載入
```gherkin
Given 使用者開啟報價單列表頁面
When 頁面載入
Then 呼叫 GET /api/quotations
And 顯示資料庫中的所有報價單
And 不顯示任何硬編碼的假資料
```

#### Scenario: 下拉選單選項動態載入
```gherkin
Given 報價單表單中的產品下拉選單
When 表單初始化
Then 產品選項來自 useProducts hook
And 不使用硬編碼的產品陣列
```

---

### Requirement: API 回應資料格式一致性

所有 API 端點 MUST 回傳一致的資料格式，確保前端正確解析。

#### Scenario: 成功回應格式
```gherkin
Given API 成功處理請求
When 回傳資料到前端
Then response 格式為：
  {
    "data": [...] 或 { ... },
    "status": 200
  }
And 前端可使用 response.data 存取資料
```

#### Scenario: 錯誤回應格式
```gherkin
Given API 處理請求時發生錯誤
When 回傳錯誤到前端
Then response 格式為：
  {
    "error": "錯誤訊息",
    "status": 4xx 或 5xx
  }
And 前端可使用 response.error 顯示錯誤
```

#### Scenario: 空資料處理
```gherkin
Given 資料庫查詢結果為空
When API 回傳資料
Then response 為 { "data": [] }
And 前端顯示「無資料」的空狀態
And 不顯示 loading 或錯誤狀態
```

---

### Requirement: 資料庫 RLS 正確設定

Row Level Security MUST 正確配置，確保使用者只能存取自己的資料。

#### Scenario: 使用者只能查看自己的產品
```gherkin
Given 使用者 A 已登入
When 呼叫 GET /api/products
Then 只回傳 user_id = A.id 的產品
And 不回傳其他使用者的產品
```

#### Scenario: 使用者只能編輯自己的產品
```gherkin
Given 使用者 A 嘗試編輯產品 X
And 產品 X 的 user_id = B.id (不是 A)
When 呼叫 PUT /api/products/X
Then 資料庫 RLS 阻擋更新
And 回傳 403 Forbidden
```

#### Scenario: 使用者只能刪除自己的產品
```gherkin
Given 使用者 A 嘗試刪除產品 Y
And 產品 Y 的 user_id = A.id
When 呼叫 DELETE /api/products/Y
Then 資料庫允許刪除
And 回傳 200 OK
```

---

### Requirement: 資料一致性驗證

CRUD 操作 MUST 正確反映到資料庫，確保資料一致性。

#### Scenario: 建立資料後立即可查詢
```gherkin
Given 使用者建立新產品 P
When POST /api/products 成功回傳
Then 立即呼叫 GET /api/products
And 回傳的列表包含產品 P
```

#### Scenario: 更新資料後反映變更
```gherkin
Given 產品 Q 的名稱為「舊名稱」
When 使用者更新為「新名稱」
And PUT /api/products/Q 成功
Then GET /api/products/Q 回傳「新名稱」
```

#### Scenario: 刪除資料後不再出現
```gherkin
Given 產品 R 存在於資料庫
When DELETE /api/products/R 成功
Then GET /api/products 回傳的列表不包含產品 R
And GET /api/products/R 回傳 404 Not Found
```

---

### Requirement: 載入狀態和錯誤處理

前端 MUST 正確處理資料載入過程中的各種狀態。

#### Scenario: 顯示載入狀態
```gherkin
Given 使用者開啟產品列表
When 資料尚未從 API 載入完成
Then 顯示 loading spinner
And 不顯示空資料訊息或錯誤訊息
```

#### Scenario: 載入完成顯示資料
```gherkin
Given API 回傳產品資料
When React Query 狀態更新為 success
Then 隱藏 loading spinner
And 顯示產品列表
```

#### Scenario: 處理 API 錯誤
```gherkin
Given API 回傳錯誤（500 或網路錯誤）
When React Query 狀態更新為 error
Then 隱藏 loading spinner
And 顯示錯誤訊息
And 提供「重試」按鈕（可選）
```

#### Scenario: 處理空資料
```gherkin
Given API 回傳空陣列
When React Query 狀態更新為 success
And data.length === 0
Then 隱藏 loading spinner
And 顯示空狀態畫面
And 提供「建立第一個項目」按鈕
```

---

### Requirement: 快取管理策略

React Query MUST 正確管理資料快取，避免不必要的 API 呼叫。

#### Scenario: 使用 stale time 減少 API 呼叫
```gherkin
Given products query 的 staleTime 設定為 5 分鐘
When 使用者在 5 分鐘內多次開啟產品列表
Then 不重新呼叫 API
And 直接使用快取資料
```

#### Scenario: invalidate 後重新載入
```gherkin
Given 使用者建立新產品
When createProduct mutation 成功
Then invalidate ['products'] query
And 自動重新呼叫 GET /api/products
And 列表顯示最新資料
```

#### Scenario: 樂觀更新
```gherkin
Given 使用者刪除產品 S
When deleteProduct mutation 執行
Then 立即從前端列表移除產品 S（樂觀更新）
And 同時呼叫 DELETE /api/products/S
If 刪除失敗
Then 恢復產品 S 到列表
And 顯示錯誤訊息
```

## MODIFIED Requirements
無

## REMOVED Requirements
無
