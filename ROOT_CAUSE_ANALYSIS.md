# 根本原因分析報告

## 執行時間
2025-11-02 21:30 (UTC+8)

## 用戶報告的問題

1. **產品價格編輯還原成空白**
   - 現象：編輯產品價格後儲存，重新載入頁面價格變成空白

2. **客戶建立無法儲存**
   - 現象：填寫客戶資料點擊建立後，資料無法儲存

3. **報價單建立失敗**
   - 現象：建立報價單時出現 "Failed to create quotation" 錯誤

## 根本原因

### 資料庫 Schema vs API 資料格式不匹配

**資料庫實際結構** (zeabur-schema.sql):
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name JSONB NOT NULL,        -- ⚠️  JSONB 格式
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address JSONB,               -- ⚠️  JSONB 格式
  tax_id VARCHAR(50),
  contact_person JSONB,        -- ⚠️  JSONB 格式
  ...
);

CREATE TABLE products (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name JSONB NOT NULL,         -- ⚠️  JSONB 格式
  description JSONB,           -- ⚠️  JSONB 格式
  unit_price DECIMAL(12, 2) NOT NULL,
  ...
);
```

**JSONB 欄位期待的格式**:
```json
{
  "zh": "中文內容",
  "en": "English content"
}
```

**但 API 傳遞的格式** (app/api/customers/route.ts:52-72):
```typescript
// ❌ 錯誤：傳遞簡單字串
const { name, email, phone, address, tax_id, contact_person } = body

await createCustomer({
  user_id: user.id,
  name,                    // ❌ 傳遞字串，但資料庫期待 JSONB
  email,
  phone: phone || undefined,
  address: address || undefined,  // ❌ 傳遞字串，但資料庫期待 JSONB
  tax_id: tax_id || undefined,
  contact_person: contact_person || undefined,  // ❌ 傳遞字串，但資料庫期待 JSONB
})
```

### 為什麼會發生這個問題？

1. **前端表單只收集單一語言**
   - 用戶在前端表單輸入 "測試客戶" (純字串)
   - 前端送出 `{ name: "測試客戶" }` 到 API

2. **API 未轉換資料格式**
   - API 直接傳遞字串到資料庫函數
   - 資料庫函數 `createCustomer()` 直接插入字串

3. **PostgreSQL JSONB 欄位接受字串但不會自動轉換**
   - 插入 `name = "測試客戶"` 到 JSONB 欄位
   - PostgreSQL 將字串視為 JSON 字串 (而非物件)
   - 結果：儲存為 `"測試客戶"` 而非 `{"zh":"測試客戶","en":""}`

4. **前端讀取資料時出錯**
   - 前端期待 `name.zh` 但資料庫儲存的是 `"測試客戶"`
   - TypeScript 無法讀取 `.zh` 屬性
   - 結果：顯示空白或錯誤

## 影響範圍

### 受影響的 API

1. **POST /api/customers** (客戶建立)
   - `name` - 必須是 JSONB `{ zh: string, en: string }`
   - `address` - 必須是 JSONB `{ zh: string, en: string }`
   - `contact_person` - 必須是 JSONB `{ zh: string, en: string }`

2. **PUT /api/customers/[id]** (客戶更新)
   - 同樣的 JSONB 欄位需要轉換

3. **POST /api/products** (產品建立)
   - `name` - 必須是 JSONB `{ zh: string, en: string }`
   - `description` - 必須是 JSONB `{ zh: string, en: string }`

4. **PUT /api/products/[id]** (產品更新)
   - Supabase 無法正確處理 JSONB 欄位
   - 需要改用 Zeabur 直接查詢或正確轉換格式

5. **POST /api/quotations** (報價單建立)
   - 取得客戶資料時需要正確處理 JSONB 格式
   - `customer_name` 欄位需要從 JSONB 轉換

## 解決方案

### 方案 1: 在 API 層轉換資料格式（推薦）

**優點**:
- 最小化修改
- 前端無需修改
- 資料庫 schema 保持不變

**實作**:
```typescript
// app/api/customers/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, phone, address, contact_person } = body

  // ✅ 轉換為 JSONB 格式
  const customer = await createCustomer({
    user_id: user.id,
    name: typeof name === 'string'
      ? { zh: name, en: '' }  // 轉換字串為 JSONB
      : name,                  // 如果已是物件，直接使用
    email,
    phone,
    address: address
      ? (typeof address === 'string' ? { zh: address, en: '' } : address)
      : undefined,
    contact_person: contact_person
      ? (typeof contact_person === 'string' ? { zh: contact_person, en: '' } : contact_person)
      : undefined,
  })
}
```

### 方案 2: 修改資料庫 Schema

**優點**:
- 簡化 TypeScript 類型
- 移除多語言複雜度

**缺點**:
- 需要資料庫遷移
- 可能破壞現有資料
- 不支援未來的多語言需求

**不推薦此方案**，因為用戶可能已有資料。

### 方案 3: 修改前端傳遞格式

**優點**:
- API 層更簡單

**缺點**:
- 需要修改所有前端表單
- 增加前端複雜度
- 違反單一職責原則

**不推薦此方案**，應該由 API 層負責資料轉換。

## 修復計劃

### 第一階段：修復 API 路由

1. ✅ **修復 POST /api/customers** (客戶建立)
   - 轉換 `name`, `address`, `contact_person` 為 JSONB 格式

2. ✅ **修復 PUT /api/customers/[id]** (客戶更新)
   - 同樣轉換 JSONB 欄位

3. ✅ **修復 POST /api/products** (產品建立)
   - 轉換 `name`, `description` 為 JSONB 格式

4. ✅ **修復 PUT /api/products/[id]** (產品更新)
   - 改用 Zeabur 直接查詢 或 正確轉換 Supabase 資料

5. ✅ **修復 POST /api/quotations** (報價單建立)
   - 正確處理客戶的 JSONB 資料

### 第二階段：建立輔助函數

建立 `lib/utils/jsonb-converter.ts`:
```typescript
export function toJsonbField(
  value: string | { zh: string; en: string } | undefined,
  defaultLang: 'zh' | 'en' = 'zh'
): { zh: string; en: string } | undefined {
  if (!value) return undefined
  if (typeof value === 'string') {
    return defaultLang === 'zh'
      ? { zh: value, en: '' }
      : { zh: '', en: value }
  }
  return value
}

export function fromJsonbField(
  value: { zh: string; en: string } | string | undefined,
  lang: 'zh' | 'en' = 'zh'
): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[lang] || value.zh || value.en || ''
}
```

### 第三階段：測試驗證

1. 測試客戶建立
2. 測試產品編輯
3. 測試報價單建立
4. 使用 Chrome DevTools 監控 API 回應
5. 檢查資料庫儲存的實際格式

### 第四階段：部署

1. 執行完整建置 `pnpm run build`
2. 執行 TypeScript 檢查 `pnpm run typecheck`
3. 執行 Lint 檢查 `pnpm run lint`
4. 部署到 Cloudflare Workers
5. 使用 wrangler tail 監控即時日誌
6. 用戶驗證功能

## 預期結果

修復後：

1. **產品價格編輯**
   - 儲存價格後重新載入，價格正確顯示
   - 不會還原成空白

2. **客戶建立**
   - 填寫資料後點擊建立，成功儲存到資料庫
   - 客戶列表顯示新建立的客戶

3. **報價單建立**
   - 選擇客戶後建立報價單，成功建立
   - 報價單列表顯示新建立的報價單

---

**報告建立時間**：2025-11-02 21:30 (UTC+8)
**報告作者**：Claude Code
**修復狀態**：🔄 進行中
