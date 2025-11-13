# Implementation Tasks

## 階段 1：資料庫 Schema 修正

- [x] 建立 migration `migrations/d1/005_add_bilingual_text_columns.sql`
  ```sql
  ALTER TABLE quotation_items ADD COLUMN description TEXT;
  ```
- [x] 執行 migration：`npx wrangler d1 migrations apply quotation-system-db --local`
- [x] 驗證欄位已新增：
  ```sql
  SELECT sql FROM sqlite_master WHERE name = 'quotation_items';
  ```
- [x] 確認 `quotation_items.description` 欄位存在

## 階段 2：DAL 層重構（`lib/dal/quotations.ts`）

### 2.1 新增 Row Interfaces（資料庫層型別）
- [x] 新增 `QuotationRow` interface（notes 為 `string | null`）
- [x] 新增 `QuotationItemRow` interface（description 為 `string`）

### 2.2 更新應用層 Interfaces
- [x] 修改 `Quotation` interface，notes 型別改為 `{ zh: string; en: string } | null`
- [x] 修改 `QuotationItem` interface，新增 `description: { zh: string; en: string }`

### 2.3 新增 Parse 函式（反序列化）
- [x] 實作 `parseQuotationRow(row: QuotationRow): Quotation`
  - 處理 `notes` JSON 反序列化
  - 使用 try-catch 提供 fallback
  - 記錄無效 JSON 的 warning
- [x] 實作 `parseQuotationItemRow(row: QuotationItemRow): QuotationItem`
  - 處理 `description` JSON 反序列化
  - 使用 try-catch 提供 fallback

### 2.4 更新 CRUD 函式
- [x] 修改 `getQuotations()`：使用 `parseQuotationRow()` 反序列化
- [x] 修改 `getQuotationById()`：使用 `parseQuotationRow()` 反序列化
- [x] 修改 `getQuotationItems()`：使用 `parseQuotationItemRow()` 反序列化
- [x] 修改 `createQuotation()`：
  - 序列化 `notes` 為 JSON 字串（`JSON.stringify()`）
  - 回傳時自動反序列化（透過 `getQuotationById()`）
- [x] 修改 `createQuotationItem()`：
  - 接受 `description: { zh: string; en: string }` 參數
  - 序列化 description 為 JSON 字串
  - INSERT 語句包含 description 欄位
  - 回傳時自動反序列化
- [x] 修改 `updateQuotation()`：處理 notes 序列化（如果有更新）
- [x] 執行 TypeScript 型別檢查：`pnpm run typecheck`

## 階段 3：型別定義修正（`types/models.ts`）

- [x] 修改 `Quotation` interface：
  ```typescript
  notes: BilingualText | null  // 原為 string | null
  ```
- [x] 修改 `QuotationItem` interface：
  ```typescript
  description: BilingualText  // 新增欄位
  ```
- [x] 修改 `CreateQuotationData` interface：
  ```typescript
  notes?: BilingualText  // 原為 string
  ```
- [x] 新增 `CreateQuotationItemData` interface（如果不存在）：
  ```typescript
  export interface CreateQuotationItemData {
    quotation_id: string
    product_id?: string
    description: BilingualText
    quantity: number
    unit_price: number
    discount?: number
    subtotal: number
  }
  ```
- [x] 執行 TypeScript 型別檢查：`pnpm run typecheck`

## 階段 4：API 層簡化（`app/api/quotations/route.ts`）

### POST /api/quotations（建立）
- [x] 檢查 POST handler，確認**不需要**手動序列化（DAL 已處理）
- [x] 確保 `createQuotation()` 呼叫傳遞 `notes` 物件（不是字串）
- [x] 確保 `createQuotationItem()` 呼叫傳遞 `description` 物件（不是字串）
- [x] 移除任何手動 `JSON.stringify()` 呼叫（如果存在）

### GET /api/quotations（列表）
- [x] 檢查 GET handler，確認**不需要**手動反序列化（DAL 已處理）
- [x] 移除任何手動 `JSON.parse()` 呼叫（如果存在）
- [x] 直接回傳 `getQuotations()` 的結果

### GET /api/quotations/:id（詳情）
- [x] 檢查 `app/api/quotations/[id]/route.ts` GET handler
- [x] 確認**不需要**手動反序列化 `notes` 和 `description`
- [x] 移除任何手動 `JSON.parse()` 呼叫

### PUT /api/quotations/:id（更新）
- [x] 檢查 PUT handler
- [x] 如果更新 `notes`，確保傳遞物件（不是字串）
- [x] DAL 層會自動處理序列化

## 階段 5：前端驗證（使用 Chrome DevTools）

- [ ] 開啟報價單建立表單（`/quotations/new`）
- [ ] 填寫完整資料：
  - 客戶：選擇現有客戶
  - 產品：新增至少一個項目，填寫中英文描述
  - 備註：填寫中英文備註
- [ ] 送出表單
- [ ] **檢查 Network 標籤**：
  - POST /api/quotations 請求成功（201 Created）
  - Request payload 包含 `notes: { zh: "...", en: "..." }`
  - Response 包含正確的 notes 物件
- [ ] **檢查 Console 標籤**：
  - 無 D1_TYPE_ERROR 錯誤
  - 無 TypeScript 錯誤
  - 無 JSON.parse() 錯誤
- [ ] **檢查資料庫**：
  ```bash
  npx wrangler d1 execute quotation-system-db --local --command="SELECT description FROM quotation_items ORDER BY created_at DESC LIMIT 1;"
  ```
  - 預期：`{"zh":"中文描述","en":"English description"}`

## 階段 6：整合測試

- [ ] **建立報價單完整流程**：
  1. 前端建立報價單 → API → DAL → D1 儲存
  2. 檢查資料庫：`SELECT notes, created_at FROM quotations ORDER BY created_at DESC LIMIT 1;`
  3. 預期：notes 為 `{"zh":"...","en":"..."}` 或 NULL
- [ ] **查詢報價單列表**：
  1. 呼叫 GET /api/quotations
  2. 檢查回傳的 `quotations[0].notes` 為物件（不是字串）
  3. 前端列表正確顯示中英文內容
- [ ] **查詢報價單詳情**：
  1. 呼叫 GET /api/quotations/:id
  2. 檢查 `quotation.notes` 為物件
  3. 檢查 `items[0].description` 為物件
  4. 前端詳情頁正確顯示
- [ ] **更新報價單**：
  1. 修改備註（中英文）
  2. 呼叫 PUT /api/quotations/:id
  3. 重新查詢，確認更新成功

## 階段 7：錯誤處理測試

- [ ] **測試 null notes**：
  - 建立報價單時不填寫備註
  - 確認 API 不報錯
  - 確認資料庫 `notes` 為 NULL
  - 確認 GET API 回傳 `notes: null`
- [ ] **測試無效 JSON（模擬）**：
  - 手動修改資料庫：
    ```sql
    UPDATE quotations SET notes = 'invalid json' WHERE id = 'test-id';
    ```
  - 呼叫 GET /api/quotations
  - 確認 Console 有 warning
  - 確認回傳 `notes: { zh: "invalid json", en: "invalid json" }`（fallback）
  - 確認不拋出異常
- [ ] **測試空字串 description**：
  - 前端送出空的 description（如果可能）
  - 確認 API 驗證拒絕（如果有驗證層）

## 階段 8：Lint 和 Typecheck

- [x] 執行 `pnpm run lint:fix` 修正 ESLint 錯誤
- [x] 執行 `pnpm run lint` 確認無錯誤
- [x] 執行 `pnpm run typecheck` 確認無型別錯誤
- [ ] 執行 `pnpm run build` 確認專案可建置

## 階段 9：程式碼審查

- [ ] 對照 `lib/dal/customers.ts` 確認 Quotations DAL 架構一致：
  - ✅ 有 `Row` interface
  - ✅ 有 `parseRow()` 函式
  - ✅ 有 try-catch 錯誤處理
  - ✅ 序列化/反序列化邏輯一致
- [ ] 對照 `lib/dal/products.ts` 確認 BilingualText 處理一致
- [ ] 檢查所有 TODO 註解，確認無遺留問題

## 階段 10：文件更新

- [ ] 更新 `DEPLOYMENT_CHECKLIST.md` 記錄此修正（如果有此檔案）
- [ ] 更新 `ISSUELOG.md` 記錄問題和解決方案（如果有此檔案）
- [ ] 確認 OpenSpec proposal 與實作一致

## 驗收標準

**所有以下項目必須通過**：

### 功能驗收
1. ✅ 報價單建立成功，無 D1_TYPE_ERROR
2. ✅ 資料庫 `quotation_items.description` 儲存為有效 JSON 字串格式
3. ✅ 資料庫 `quotations.notes` 儲存為有效 JSON 字串或 NULL
4. ✅ GET /api/quotations 回傳的 notes 為 `BilingualText | null` 物件
5. ✅ GET /api/quotations/:id 回傳的 items[].description 為 `BilingualText` 物件
6. ✅ 前端報價單列表正確顯示中英文描述
7. ✅ 前端報價單詳情頁正確顯示備註
8. ✅ 編輯報價單後資料正確更新

### 程式碼品質
9. ✅ TypeScript 型別檢查通過（`pnpm run typecheck`）
10. ✅ ESLint 無錯誤（`pnpm run lint`）
11. ✅ 專案可成功建置（`pnpm run build`）
12. ✅ DAL 層與 Customers/Products 架構一致（使用 parseRow 模式）
13. ✅ 所有 BilingualText 欄位處理邏輯一致

### 錯誤處理
14. ✅ 無效 JSON 不導致系統崩潰（有 fallback）
15. ✅ null 值正確處理
16. ✅ Console 有適當的 warning（無效 JSON 時）

## 預計時間

- 階段 1（Migration）：15 分鐘
- 階段 2（DAL 重構）：60 分鐘
- 階段 3（型別定義）：20 分鐘
- 階段 4（API 簡化）：30 分鐘
- 階段 5（前端驗證）：30 分鐘
- 階段 6（整合測試）：30 分鐘
- 階段 7（錯誤測試）：20 分鐘
- 階段 8（Lint/Typecheck）：15 分鐘
- 階段 9（程式碼審查）：20 分鐘
- 階段 10（文件）：10 分鐘

**總計**：約 3.5-4 小時

## 關鍵注意事項

### ⚠️ 與原 Proposal 的差異
**原方案**（不採用）：在 API 層手動序列化
**新方案**（採用）：在 DAL 層使用 parseRow 模式

**影響**：
- ✅ API 層更簡潔（無需手動 JSON.stringify/parse）
- ✅ 與現有 Customers/Products 架構一致
- ✅ 型別更安全（資料庫層/應用層分離）
- ✅ 錯誤隔離更好（單筆資料 parse 失敗不影響其他）

### 🔍 驗證重點
1. **DAL 層**：parseRow 函式必須有 try-catch
2. **API 層**：不應有手動 JSON.stringify/parse
3. **型別定義**：應用層使用物件，Row interface 使用字串
4. **前端**：無需修改（hooks 已使用 BilingualText 型別）

### 📝 參考實作
開發時隨時參考：
- `lib/dal/customers.ts`（parseCustomerRow 模式）
- `lib/dal/products.ts`（parseProductRow 模式）
