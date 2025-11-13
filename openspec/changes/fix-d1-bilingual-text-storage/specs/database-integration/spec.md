# database-integration Spec Delta

## ADDED Requirements

### Requirement: D1 資料庫必須支援 BilingualText 儲存

D1 資料庫 MUST 正確儲存和讀取雙語文字（BilingualText）格式的資料。由於 D1 不支援 JSONB 型別，雙語文字 MUST 以 JSON 字串形式儲存於 TEXT 欄位。

#### Scenario: 建立報價單項目包含雙語描述
```gherkin
Given 使用者在報價單表單中填寫產品描述
And 描述包含中文「產品 A 規格說明」和英文「Product A Specification」
When 送出 POST /api/quotations
Then API 層將 description: { zh: "產品 A 規格說明", en: "Product A Specification" } 序列化為 JSON 字串
And DAL 層將 JSON 字串插入 quotation_items.description 欄位
And 資料庫儲存內容為 '{"zh":"產品 A 規格說明","en":"Product A Specification"}'
And 回傳 201 Created，無 D1_TYPE_ERROR
```

#### Scenario: 讀取報價單項目反序列化雙語描述
```gherkin
Given 資料庫 quotation_items 表包含一筆資料
And description 欄位值為 '{"zh":"中文描述","en":"English description"}'
When 呼叫 GET /api/quotations/:id
Then API 層讀取 description 字串
And 使用 JSON.parse() 轉換為物件 { zh: "中文描述", en: "English description" }
And 回傳的 items[0].description 為正確的 BilingualText 物件
And 前端可直接存取 description.zh 和 description.en
```

#### Scenario: 建立報價單包含雙語備註
```gherkin
Given 使用者在報價單表單中填寫備註
And 備註包含中文「請於三日內回覆」和英文「Please reply within 3 days」
When 送出 POST /api/quotations
And 請求 body 包含 notes: { zh: "請於三日內回覆", en: "Please reply within 3 days" }
Then API 層將 notes 序列化為 JSON 字串
And 插入 quotations.notes 欄位
And 資料庫儲存 '{"zh":"請於三日內回覆","en":"Please reply within 3 days"}'
```

#### Scenario: 處理空的雙語文字欄位
```gherkin
Given 使用者建立報價單時未填寫備註
When 送出 POST /api/quotations
And notes 欄位為 undefined
Then API 層將 notes 設為 null
And 插入資料庫時 quotations.notes = NULL
And GET /api/quotations 回傳的 notes 為 null（不是空字串或空物件）
```

#### Scenario: 容錯處理無效的 JSON 格式
```gherkin
Given 資料庫 quotations.notes 欄位因手動修改儲存了無效 JSON："invalid json"
When 呼叫 GET /api/quotations
Then API 層嘗試 JSON.parse(notes)
And 捕獲 SyntaxError 異常
And 提供 fallback：{ zh: "invalid json", en: "invalid json" }
And 回傳資料不導致前端崩潰
And Console 記錄 warning："Invalid JSON in quotations.notes for id=xxx"
```

---

## MODIFIED Requirements

### Requirement: 資料一致性驗證（新增雙語文字檢查）

CRUD 操作 MUST 正確反映到資料庫，確保資料一致性。**雙語文字欄位** MUST 在儲存和讀取時保持格式一致。

#### Scenario: 建立資料後立即查詢雙語欄位
```gherkin
Given 使用者建立新報價單 Q，包含備註 { zh: "測試", en: "Test" }
When POST /api/quotations 成功回傳
Then 立即呼叫 GET /api/quotations/Q
And 回傳的 quotation.notes.zh === "測試"
And 回傳的 quotation.notes.en === "Test"
And 型別為物件，不是字串
```

#### Scenario: 更新雙語欄位後反映變更
```gherkin
Given 報價單項目 I 的 description.zh 為「舊描述」
When 使用者更新為 { zh: "新描述", en: "New description" }
And PUT /api/quotations/:id 成功
Then GET 回傳的 items 中，item I 的 description.zh === "新描述"
And description.en === "New description"
```

---

## REMOVED Requirements

無移除的需求。
