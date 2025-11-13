# quotation-crud-api Specification

## Purpose
定義報價單 CRUD API 的行為規範，確保雙語文字欄位的正確處理和資料一致性。

## ADDED Requirements

### Requirement: API 必須正確處理 BilingualText 序列化

所有接受 BilingualText 類型欄位的 API MUST 在儲存前序列化為 JSON 字串，在讀取後反序列化為物件。

#### Scenario: POST /api/quotations 序列化雙語欄位
```gherkin
Given 前端送出報價單建立請求
And 請求 body 包含：
  {
    "notes": { "zh": "備註", "en": "Notes" },
    "items": [
      {
        "description": { "zh": "產品描述", "en": "Product description" },
        "quantity": 10,
        "unit_price": 100,
        "discount": 0,
        "subtotal": 1000
      }
    ]
  }
When API 處理請求
Then notes 轉換為 '{"zh":"備註","en":"Notes"}'
And items[0].description 轉換為 '{"zh":"產品描述","en":"Product description"}'
And 呼叫 createQuotation(db, userId, { notes: <JSON字串>, ... })
And 呼叫 createQuotationItem(db, { description: <JSON字串>, ... })
```

#### Scenario: GET /api/quotations 反序列化雙語欄位
```gherkin
Given 資料庫包含報價單，notes 為 '{"zh":"測試","en":"Test"}'
When 呼叫 GET /api/quotations
Then 回傳的 JSON 中 quotations[0].notes 為物件 { zh: "測試", en: "Test" }
And 前端可直接使用 quotation.notes.zh
```

#### Scenario: GET /api/quotations/:id 包含項目雙語描述
```gherkin
Given 資料庫包含報價單 Q，含項目 I
And I.description = '{"zh":"中文","en":"English"}'
When 呼叫 GET /api/quotations/Q
Then 回傳的 JSON 包含：
  {
    "id": "Q",
    "notes": { "zh": "...", "en": "..." },
    "items": [
      {
        "id": "I",
        "description": { "zh": "中文", "en": "English" },
        ...
      }
    ]
  }
```

#### Scenario: PUT /api/quotations/:id 更新雙語欄位
```gherkin
Given 報價單 Q 存在於資料庫
When 呼叫 PUT /api/quotations/Q
And 請求 body 包含 notes: { zh: "新備註", en: "New notes" }
Then API 序列化 notes 為 JSON 字串
And 更新 quotations.notes 欄位
And 回傳更新後的報價單，notes 為物件格式
```

---

### Requirement: API 必須驗證 BilingualText 格式

API MUST 驗證雙語文字欄位包含必要的語言鍵（zh 和 en）。

#### Scenario: 拒絕缺少語言鍵的請求
```gherkin
Given 前端送出報價單建立請求
And notes 為 { zh: "測試" }（缺少 en）
When API 驗證請求 body
Then 回傳 400 Bad Request
And 錯誤訊息為 "notes.en is required"
```

#### Scenario: 拒絕空字串的雙語欄位
```gherkin
Given 前端送出報價單項目
And description 為 { zh: "", en: "" }
When API 驗證請求
Then 回傳 400 Bad Request
And 錯誤訊息為 "description.zh and description.en cannot be empty"
```

#### Scenario: 允許可選的雙語欄位為 null
```gherkin
Given 前端送出報價單建立請求
And notes 為 null 或 undefined
When API 處理請求
Then 接受請求
And quotations.notes 儲存為 NULL
```

---

### Requirement: API 錯誤處理必須涵蓋序列化失敗

API MUST 捕獲序列化/反序列化過程中的錯誤，避免伺服器崩潰。

#### Scenario: 處理反序列化錯誤
```gherkin
Given 資料庫 quotations.notes 儲存了無效 JSON："not a json"
When 呼叫 GET /api/quotations
Then API 嘗試 JSON.parse("not a json")
And 捕獲 SyntaxError
And 使用 fallback 值：{ zh: "not a json", en: "not a json" }
And 記錄錯誤到 CloudFlare Workers 日誌
And 回傳 200 OK，不回傳 500 錯誤
```

#### Scenario: 處理循環參考物件
```gherkin
Given 前端錯誤送出含循環參考的 notes 物件
When API 嘗試 JSON.stringify(notes)
And 拋出 TypeError: Converting circular structure to JSON
Then API 捕獲錯誤
And 回傳 400 Bad Request
And 錯誤訊息為 "Invalid notes format"
```

---

## MODIFIED Requirements

無修改的需求（本 spec 為新增）。

## REMOVED Requirements

無移除的需求。
