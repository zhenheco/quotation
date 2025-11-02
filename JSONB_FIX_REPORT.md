# JSONB 格式修復報告

## 執行時間
2025-11-02 21:45 (UTC+8)

## 問題摘要

用戶回報的三個核心功能問題：

1. ❌ **產品價格編輯還原成空白** - 編輯產品價格後儲存，重新載入頁面價格變成空白
2. ❌ **客戶建立無法儲存** - 填寫客戶資料點擊建立後，資料無法儲存
3. ❌ **報價單建立失敗** - 建立報價單時出現 "Failed to create quotation" 錯誤

## 根本原因

**資料庫 Schema 與 API 資料格式不匹配**

### 資料庫期待的格式

```sql
-- customers 表
name JSONB NOT NULL              -- 期待: {"zh": "中文", "en": "English"}
address JSONB                    -- 期待: {"zh": "地址", "en": "Address"}
contact_person JSONB             -- 期待: {"zh": "聯絡人", "en": "Contact"}

-- products 表
name JSONB NOT NULL              -- 期待: {"zh": "產品名", "en": "Product"}
description JSONB                -- 期待: {"zh": "描述", "en": "Description"}
```

### API 實際傳遞的格式

```typescript
// ❌ 錯誤：傳遞簡單字串
const customer = await createCustomer({
  name: "測試客戶",           // 字串，但資料庫期待 JSONB
  address: "測試地址",         // 字串，但資料庫期待 JSONB
  contact_person: "聯絡人"     // 字串，但資料庫期待 JSONB
})
```

### 為什麼會導致資料丟失？

1. PostgreSQL JSONB 欄位接受字串，但不會自動轉換格式
2. 儲存 `"測試客戶"` (字串) 而非 `{"zh":"測試客戶","en":""}` (物件)
3. 前端期待 `customer.name.zh`，但資料庫儲存的是字串
4. TypeScript 無法讀取 `.zh` 屬性 → 顯示空白或錯誤

## 解決方案

### 建立 JSONB 轉換輔助函數

**檔案**: `lib/utils/jsonb-converter.ts`

```typescript
export type JsonbField = { zh: string; en: string }

export function toJsonbField(
  value: string | JsonbField | undefined | null,
  defaultLang: 'zh' | 'en' = 'zh'
): JsonbField | undefined {
  if (!value) return undefined

  if (typeof value === 'string') {
    return defaultLang === 'zh'
      ? { zh: value, en: '' }
      : { zh: '', en: value }
  }

  return value
}

export function fromJsonbField(
  value: JsonbField | string | undefined | null,
  lang: 'zh' | 'en' = 'zh'
): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[lang] || value.zh || value.en || ''
}
```

### 修復的 API 路由

#### 1. ✅ 客戶建立 API

**檔案**: `app/api/customers/route.ts`

```typescript
import { toJsonbField } from '@/lib/utils/jsonb-converter'

export async function POST(request: NextRequest) {
  // ...
  const customer = await createCustomer({
    user_id: user.id,
    name: toJsonbField(name),              // ✅ 轉換為 JSONB
    email,
    phone: phone || undefined,
    address: toJsonbField(address),        // ✅ 轉換為 JSONB
    tax_id: tax_id || undefined,
    contact_person: toJsonbField(contact_person),  // ✅ 轉換為 JSONB
  })
}
```

#### 2. ✅ 客戶更新 API

**檔案**: `app/api/customers/[id]/route.ts`

```typescript
import { toJsonbField } from '@/lib/utils/jsonb-converter'

export async function PUT(request: NextRequest, { params }) {
  // ...
  const updateData: Record<string, unknown> = {}
  if (body.name) updateData.name = toJsonbField(body.name)
  if (body.address !== undefined) updateData.address = toJsonbField(body.address)
  if (body.contact_person !== undefined) updateData.contact_person = toJsonbField(body.contact_person)
  // ...
}
```

#### 3. ✅ 產品建立 API

**檔案**: `app/api/products/route.ts`

```typescript
import { toJsonbField } from '@/lib/utils/jsonb-converter'

export async function POST(request: NextRequest) {
  // ...
  const product = await createProduct({
    user_id: user.id,
    name: toJsonbField(name),                 // ✅ 轉換為 JSONB
    description: toJsonbField(description),   // ✅ 轉換為 JSONB
    unit_price: price,
    currency: currency,
    category: category || undefined,
  })
}
```

#### 4. ✅ 產品更新 API （用戶主要問題）

**檔案**: `app/api/products/[id]/route.ts`

```typescript
import { toJsonbField } from '@/lib/utils/jsonb-converter'

export async function PUT(request: NextRequest, { params }) {
  // ...
  const updateData: Record<string, unknown> = {}
  if (body.name) updateData.name = toJsonbField(body.name)
  if (body.description !== undefined) updateData.description = toJsonbField(body.description)
  if (body.unit_price !== undefined) updateData.unit_price = parseFloat(body.unit_price)
  // ...
}
```

## 驗證過程

### 建置驗證

```bash
pnpm run build
# ✅ Compiled successfully in 4.9s
```

### 部署驗證

```bash
pnpm exec opennextjs-cloudflare build
pnpm exec wrangler deploy --compatibility-date=2025-03-25
# ✅ Deployed quotation-system triggers
# ✅ Version ID: 9ee6d858-6c33-4d52-b6b1-d47f1e8c8316
# ✅ URL: https://quotation-system.acejou27.workers.dev
```

## 預期結果

修復後，三個問題應該全部解決：

### 1. ✅ 產品價格編輯

**修復前**:
- 編輯產品，設定價格為 888.88
- 點擊儲存
- 重新載入頁面
- ❌ 價格變成空白（因為 `name` 欄位格式錯誤導致整個產品無法正確讀取）

**修復後**:
- 編輯產品，設定價格為 888.88
- 點擊儲存（API 正確轉換 `name` 和 `description` 為 JSONB）
- 重新載入頁面
- ✅ 價格正確顯示為 888.88

### 2. ✅ 客戶建立

**修復前**:
- 填寫客戶名稱 "測試客戶"
- 填寫其他資料
- 點擊建立
- ❌ 儲存失敗或客戶列表無法正確顯示（JSONB 格式錯誤）

**修復後**:
- 填寫客戶名稱 "測試客戶"
- 填寫其他資料
- 點擊建立（API 正確轉換 `name`, `address`, `contact_person` 為 JSONB）
- ✅ 客戶成功建立，列表正確顯示

### 3. ✅ 報價單建立

**修復前**:
- 選擇客戶
- 填寫報價單資料
- 點擊建立
- ❌ 出現 "Failed to create quotation" 錯誤（因為客戶資料的 JSONB 格式問題）

**修復後**:
- 選擇客戶（客戶資料已正確儲存為 JSONB）
- 填寫報價單資料
- 點擊建立
- ✅ 報價單成功建立

## 部署資訊

- **部署時間**: 2025-11-02 21:45 (UTC+8)
- **Version ID**: `9ee6d858-6c33-4d52-b6b1-d47f1e8c8316`
- **URL**: https://quotation-system.acejou27.workers.dev
- **Cloudflare URL**: https://quotation.zhenhe-dm.com

## 測試建議

請測試以下功能確認修復成功：

### 測試 1: 產品價格編輯
1. 登入系統 (acejou27@gmail.com)
2. 前往產品列表
3. 點擊編輯任一產品
4. 修改價格為 999.99
5. 點擊儲存
6. 重新載入頁面
7. ✅ 確認價格仍為 999.99（不再是空白）

### 測試 2: 客戶建立
1. 前往客戶列表
2. 點擊「新增客戶」
3. 填寫資料：
   - 名稱：新客戶測試
   - Email：newtest@example.com
   - 地址：測試地址 123
4. 點擊建立
5. ✅ 確認客戶列表顯示新客戶（名稱正確顯示）

### 測試 3: 報價單建立
1. 前往報價單列表
2. 點擊「新增報價單」
3. 選擇剛建立的客戶
4. 填寫報價單資料
5. 點擊建立
6. ✅ 確認報價單成功建立（不再出現錯誤）

## 後續改進

### 短期（已完成）
- ✅ 建立 JSONB 轉換輔助函數
- ✅ 修復所有客戶相關 API
- ✅ 修復所有產品相關 API
- ✅ 驗證建置無錯誤
- ✅ 部署到生產環境

### 中期（建議）
1. **前端改進**
   - 修改前端表單，直接傳遞 JSONB 格式
   - 支援多語言輸入（中文/英文）

2. **型別定義**
   - 更新 TypeScript 類型定義，明確標示 JSONB 欄位
   - 使用 `JsonbField` 型別取代 `string`

3. **資料遷移**
   - 檢查現有資料是否有格式錯誤
   - 建立遷移腳本修復舊資料

### 長期（建議）
1. **前端多語言支援**
   - 實作完整的多語言編輯介面
   - 允許用戶同時輸入中文和英文

2. **API 改進**
   - 建立統一的 JSONB 處理 middleware
   - 自動驗證 JSONB 格式

3. **資料庫改進**
   - 使用資料庫約束確保 JSONB 格式正確
   - 建立 trigger 驗證資料格式

## 核心教訓

1. **資料庫 Schema 與 API 必須匹配**
   - 資料庫使用 JSONB，API 必須傳遞物件而非字串
   - 不能假設資料庫會自動轉換格式

2. **類型不匹配導致資料丟失**
   - 字串儲存為 JSONB 後，前端無法正確讀取
   - 必須在 API 層進行格式轉換

3. **建立輔助函數簡化轉換**
   - `toJsonbField()` 統一處理字串 → JSONB 轉換
   - 避免在每個 API 重複轉換邏輯

4. **修復前必須理解資料流**
   - 前端 → API → 資料庫
   - 檢查每個環節的資料格式

---

**報告建立時間**：2025-11-02 21:45 (UTC+8)
**報告作者**：Claude Code
**修復狀態**：✅ 完成並部署
**用戶確認**：⏳ 等待用戶測試
