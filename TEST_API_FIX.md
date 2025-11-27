# API 500 錯誤修復驗證

## 問題總結
1. ❌ `updateQuotation()` 不返回 `customer_email` 欄位
2. ❌ PUT/DELETE handlers 使用不兼容 Cloudflare Workers 的 `createClient()`
3. ❌ Quotation `status` 類型不一致

## 修復內容

### 1. 修復 `updateQuotation()` 返回完整資料
**檔案**: `/lib/services/database.ts:348-383`

**問題**: `RETURNING *` 只返回 `quotations` 表欄位，不包含 JOIN 的 `customer_email`

**解決**:
```typescript
export async function updateQuotation(...): Promise<Quotation | null> {
  try {
    const { fields, values, paramCount } = buildUpdateFields(
      data,
      QUOTATION_ALLOWED_FIELDS
    )

    if (fields.length === 0) {
      return getQuotationById(id, userId)
    }

    values.push(id, userId)

    const result = await query(
      `UPDATE quotations
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    )

    if (!result.rows[0]) {
      return null
    }

    // 🔧 關鍵修復：重新查詢以獲取 JOIN 的欄位
    return getQuotationById(id, userId)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Update quotation failed:', { id, error: errorMessage })
    throw error
  }
}
```

### 2. 修復 PUT/DELETE 使用 `createApiClient`
**檔案**: `/app/api/quotations/[id]/route.ts`

**問題**:
- Line 2: `import { createClient } from '@/lib/supabase/server'` ❌
- Line 132: `const supabase = await createClient()` ❌ (Cloudflare Workers 不支援)
- Line 257: `const supabase = await createClient()` ❌

**解決**:
```typescript
// ✅ 移除不兼容的 import
import { createApiClient } from '@/lib/supabase/api'

// ✅ PUT handler
export async function PUT(request: NextRequest, ...) {
  const supabase = createApiClient(request)  // ✅ 使用 Workers 兼容版本
  // ...
}

// ✅ DELETE handler
export async function DELETE(request: NextRequest, ...) {
  const supabase = createApiClient(request)  // ✅ 使用 Workers 兼容版本
  // ...
}
```

### 3. 修復 Quotation status 類型定義
**檔案**: `/lib/services/database.ts:65`

**問題**: `status: 'draft' | 'signed' | 'pending' | 'expired'` (錯誤)
**資料庫實際**: `status: 'draft' | 'sent' | 'signed' | 'expired'`

**解決**:
```typescript
export interface Quotation {
  // ...
  status: 'draft' | 'sent' | 'signed' | 'expired'  // ✅ 修正
  // ...
}
```

## 驗證步驟

### 準備工作
1. 確認已部署到 Cloudflare Workers
2. 確認環境變數已設定
3. 確認有測試用報價單

### 測試 1: GET `/api/quotations/[id]`
```bash
curl -H "Cookie: $(pbpaste)" \
  https://quote24.cc/api/quotations/3d9ea7c9-11f1-436e-88c8-4f80515c69bb
```

**預期結果**:
```json
{
  "id": "3d9ea7c9-11f1-436e-88c8-4f80515c69bb",
  "customer_email": "customer@example.com",  // ✅ 必須存在
  "status": "draft",
  ...
}
```

### 測試 2: POST `/api/quotations/[id]/send`
```bash
curl -X POST \
  -H "Cookie: $(pbpaste)" \
  https://quote24.cc/api/quotations/3d9ea7c9-11f1-436e-88c8-4f80515c69bb/send
```

**預期結果**:
```json
{
  "success": true,
  "message": "Quotation sent successfully",
  "data": {
    "id": "3d9ea7c9-11f1-436e-88c8-4f80515c69bb",
    "status": "sent",  // ✅ 已更新
    "customer_email": "customer@example.com",  // ✅ 必須存在
    ...
  }
}
```

### 測試 3: 列表頁寄送按鈕
1. 開啟 https://quote24.cc/zh/quotations
2. 找到有客戶 email 的報價單
3. 點擊綠色寄送按鈕
4. **預期**: 按鈕可點擊（不顯示禁止符號）
5. **預期**: 寄送成功，狀態變為「已寄送」

### 測試 4: 檢視報價單頁面寄送
1. 開啟 https://quote24.cc/zh/quotations/[id]
2. 點擊寄送按鈕
3. **預期**: Console 無 500 錯誤
4. **預期**: 顯示成功訊息

## 預期改進

### 修復前
```
✗ GET /api/quotations/[id] → 500 Internal Server Error
✗ Console: "customer_email is undefined"
✗ 列表頁按鈕: 灰色禁止符號
✗ 檢視頁寄送: 500 錯誤
```

### 修復後
```
✓ GET /api/quotations/[id] → 200 OK with customer_email
✓ POST /api/quotations/[id]/send → 200 OK
✓ 列表頁按鈕: 綠色可點擊
✓ 檢視頁寄送: 成功寄送
```

## 技術說明

### 為什麼 `updateQuotation` 需要二次查詢？

SQL `UPDATE ... RETURNING *` 只返回被更新表的欄位：

```sql
-- ❌ 這個不會返回 customer_email
UPDATE quotations SET status = 'sent' WHERE id = $1 RETURNING *

-- ✅ 這個才會返回 customer_email
SELECT q.*, c.email as customer_email
FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
WHERE q.id = $1
```

所以我們的解決方案是：
1. 執行 UPDATE 確保寫入成功
2. 呼叫 `getQuotationById()` 重新查詢（包含 JOIN）

### 效能考量
- **額外查詢**: +1 次 SELECT
- **影響**: 微不足道（<10ms）
- **好處**: 確保前端獲得完整資料，避免 UI 錯誤

### Cloudflare Workers 限制
- ❌ 不支援 `cookies()` from `next/headers`
- ❌ 不支援 `await createClient()` (需要同步)
- ✅ 支援 `createApiClient(request)` (從 headers 讀取 cookies)
