# 資安審查報告 - Quotation System

> **審查日期**：2026-01-04
> **更新日期**：2026-01-05 (Ralph Loop 迭代 1)
> **審查範圍**：全系統程式碼（API、DAL、認證、前端）
> **整體評級**：🟡 中等風險（新增 1 個 CRITICAL 問題）

---

## 執行摘要

本次審查涵蓋：
- **100+ 個 API 路由** (`app/api/**`)
- **20+ DAL 檔案** (`lib/dal/**`)
- **認證/授權流程** (`middleware.ts`, `lib/security/**`)
- **環境變數與敏感資料處理**
- **CSRF 保護機制**
- **檔案上傳安全性**

### 統計數據（2026-01-05 更新）

| 嚴重程度 | 數量 | 狀態 |
|---------|------|------|
| CRITICAL | 6 | ⚠️ **1 個新發現** |
| HIGH | 4 | 🟢 已修復 4 個 |
| MEDIUM | 8 | 🟢 已修復 2 個 |
| LOW | 8 | 🟢 標準維護 |

### ✅ 已修復的 CRITICAL/HIGH/MEDIUM 問題（2026-01-04）

**CRITICAL:**
1. **付款金額上限驗證** - `app/api/payments/route.ts` - 加入 MAX_PAYMENT_AMOUNT 驗證
2. **供應商 API 跨租戶存取** - `app/api/suppliers/[id]/route.ts` - 加入 company_id 驗證
3. **報價單客戶資料隔離** - `app/api/quotations/[id]/route.ts` - 加入 company_id 驗證

**HIGH:**
4. **Console Log 敏感資訊** - `app/auth/callback/route.ts` - 移除 token/email 日誌，僅保留 user ID 前 8 碼
5. **檔案路徑遍歷** - `app/api/storage/company-files/route.ts` - 加入路徑正規化防止 `../` 攻擊
6. **分頁參數上限** - `app/api/accounting/invoices/route.ts`, `journals/route.ts` - 加入 MAX_PAGE_SIZE=100
7. **搜尋查詢 Filter Injection** - `lib/dal/*.ts` - 新增 `sanitizeSearchQuery()` 函數清理所有搜尋輸入

**MEDIUM:**
8. **UUID 格式驗證** - `app/api/suppliers/[id]`, `quotations/[id]`, `payments/schedules/[id]` - 加入 `isValidUUID()` 驗證
9. **Debug 日誌清理** - 多個 DAL/服務檔案 - 將 debug console.log 改為條件式輸出（僅開發環境）

### 正面發現

- ✅ 無 `dangerouslySetInnerHTML`、`innerHTML`、`eval()` 使用
- ✅ 無 SQL 注入風險（使用 Supabase Query Builder）
- ✅ Rate Limiting 實作完善
- ✅ Security Headers 完整（CSP, HSTS, X-Frame-Options）
- ✅ 密碼強度驗證已實作
- ✅ URL 重定向驗證已實作
- ✅ `.gitignore` 正確保護 `.env*` 檔案
- ✅ TypeScript 和 ESLint 檢查全部通過

---

## CRITICAL 問題（需立即修復）

### 1. 跨租戶資料存取 - `getSupplierById()`

**檔案**: `lib/dal/suppliers.ts:95-102`

```typescript
// ❌ 目前實作 - 無 company_id 過濾
export async function getSupplierById(
  db: SupabaseClient,
  supplierId: string
): Promise<Supplier | null> {
  const { data, error } = await db
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single()
```

**風險**：任何已驗證用戶可以存取其他公司的供應商資料

**修復建議**：
```typescript
export async function getSupplierById(
  db: SupabaseClient,
  userId: string,
  companyId: string,
  supplierId: string
): Promise<Supplier | null> {
  const { data, error } = await db
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .eq('company_id', companyId)  // 新增
    .single()
```

---

### 2. 跨租戶資料存取 - `getCustomerByIdOnly()`

**檔案**: `lib/dal/customers.ts:115-142`

**使用位置**: `app/api/quotations/[id]/route.ts:49`

**風險**：報價單 API 使用此函數但未重新驗證客戶所屬公司

**修復建議**：
```typescript
const customer = await getCustomerByIdOnly(db, quotation.customer_id)
if (customer?.company_id !== quotation.company_id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

---

### 3. Session Cookie httpOnly 關閉

**檔案**: `middleware.ts:82`, `lib/supabase/server.ts:32`

```typescript
httpOnly: false,  // ❌ Session tokens 可被 JavaScript 存取
```

**風險**：任何 XSS 漏洞都能竊取 session token

**修復建議**：
1. 研究 Supabase SSR 模式保持 token 在 server side
2. 若必須 client-side，實作 token rotation
3. 加強 CSP 使用 nonce-based script-src

---

### 4. CSRF 保護未完整實作

**檔案**: `app/login/LoginForm.tsx`, `app/register/RegisterForm.tsx`

**問題**：
- Middleware 有 CSRF 保護邏輯
- 但前端表單未注入 CSRF token
- 登入/註冊表單無 CSRF 保護

**修復建議**：
```typescript
// 在表單中加入 hidden input
<input type="hidden" name="_csrf" value={csrfToken} />

// 在 submit 時加入 header
headers: { 'x-csrf-token': csrfToken }
```

---

### 5. 付款金額無上限驗證

**檔案**: `app/api/payments/route.ts:52-62`

```typescript
if (typeof body.amount !== 'number' || body.amount <= 0) {
  // 有驗證 > 0，但沒有 MAX_AMOUNT
}
```

**風險**：可能導致財務資料溢位或異常

**修復建議**：
```typescript
const MAX_PAYMENT_AMOUNT = 9999999999
if (body.amount > MAX_PAYMENT_AMOUNT) {
  return NextResponse.json({ error: '金額超過上限' }, { status: 400 })
}
```

---

## HIGH 問題（一週內修復）

### 6. Super Admin 角色分配競態條件

**檔案**: `app/auth/callback/route.ts:79-90`

**問題**：首個註冊用戶自動獲得 super_admin，但無防止並發註冊

**修復建議**：
```typescript
// 使用資料庫交易或 RPC
const { data: assigned } = await db.rpc('ensure_one_system_admin', {
  p_user_id: user.id
})
```

---

### 7. 搜尋查詢 Filter Injection 風險

**檔案**: 多個 DAL 檔案的 `.or()` 使用

```typescript
.or(`name.ilike.%${query}%,code.ilike.%${query}%`)
```

**風險**：特殊字元可能繞過預期的過濾邏輯

**修復建議**：
```typescript
// 驗證搜尋輸入
if (!/^[a-zA-Z0-9\s\-@.]+$/.test(query)) {
  throw new Error('無效的搜尋字元')
}
```

---

### 8. 全站 API 缺乏 Rate Limiting

**檔案**: 所有 `app/api/**` 路由

**問題**：雖然有 rate-limiter 模組，但未套用到所有 API

**修復建議**：在 middleware.ts 統一套用

---

### 9. 檔案路徑遍歷風險

**檔案**: `app/api/storage/company-files/route.ts:18-22`

```typescript
if (!path.startsWith(user.id + '/')) {
  // 可被繞過：user.id/../../admin/file.txt
}
```

**修復建議**：
```typescript
import path from 'path'
const normalizedPath = path.normalize(requestPath)
if (!normalizedPath.startsWith(basePath)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

### 10. Console Log 洩漏敏感資料

**檔案**: `app/auth/callback/route.ts:48-49`

```typescript
console.log(`📊 [Auth Callback] Session info: { hasAccessToken: ${!!data.session.access_token} }`)
```

**修復建議**：移除或改用結構化日誌

---

### 11. Admin API 缺乏審計記錄

**檔案**: `app/api/admin/reset-user-by-email/route.ts`

**問題**：Super admin 可重置任何用戶資料，但無審計追蹤

**修復建議**：
```typescript
await db.from('audit_logs').insert({
  admin_id: user.id,
  target_user_id: targetUserId,
  action: 'reset_user_data',
  timestamp: new Date().toISOString()
})
```

---

### 12. 級聯刪除無交易保護

**檔案**: `app/api/user/reset-data/route.ts:30-60`

**問題**：多個 `.delete()` 呼叫無包裝在交易中，可能導致資料不一致

---

### 13. OAuth Metadata 未驗證

**檔案**: `app/auth/callback/route.ts:61-77`

**問題**：OAuth provider 的 metadata 直接存入資料庫，可能包含 XSS payload

**修復建議**：
```typescript
const profileData = {
  full_name: sanitizeHtml(user.user_metadata?.full_name || '')?.substring(0, 255),
  avatar_url: validateUrl(user.user_metadata?.avatar_url) ? user.user_metadata.avatar_url : null,
}
```

---

## MEDIUM 問題（一個月內修復）

### 14. 分頁參數無上限驗證
**檔案**: `app/api/accounting/invoices/route.ts:9-10`
```typescript
const pageSize = parseInt(searchParams.get('page_size') || '20') // 無上限
```

### 15. UUID 格式無驗證
**檔案**: 多個 API 路由

### 16. 數值解析無 NaN 檢查
**檔案**: `app/api/quotations/route.ts:53-65`

### 17. 邀請碼格式無驗證
**檔案**: `app/api/invitations/[code]/accept/route.ts:24-28`

### 18. CSP 使用 unsafe-inline
**檔案**: `lib/security/headers.ts:27-28`

### 19. 無 Session Timeout 機制
**檔案**: 全系統

### 20. 登出 API 缺 CSRF 保護
**檔案**: `app/api/auth/logout/route.ts`

### 21. Company ID 存於 localStorage
**檔案**: `lib/utils/company-context.ts`

### 22. 密碼驗證僅在 Client Side
**檔案**: `components/ui/PasswordStrength.tsx`

### 23. PII 未在 Response 中過濾
**檔案**: 多個 API 路由

---

## LOW 問題（標準維護）

- 錯誤狀態碼不一致
- Debug console.log 殘留
- 快取策略過寬鬆
- CSRF Token 未輪換
- 密碼重設 Rate Limiting
- 登入失敗無帳號鎖定
- 權限映射不完整
- 請求 body 缺型別驗證

---

## 優先修復順序

### 立即（24 小時內）
1. 修復 `getSupplierById()` 加入 company_id 過濾
2. 修復 `getCustomerByIdOnly()` 使用處的公司驗證
3. 加入付款金額上限驗證

### 緊急（一週內）
4. 實作 CSRF token 在登入/註冊表單
5. 實作 API Rate Limiting
6. 修復檔案路徑遍歷
7. 移除敏感資料 console.log

### 重要（兩週內）
8. 加入 Admin 操作審計記錄
9. 實作搜尋輸入驗證
10. 修復 OAuth metadata 驗證

### 標準（一個月內）
11. 研究 httpOnly cookie 替代方案
12. 實作 nonce-based CSP
13. 加入 Session timeout
14. 其他 MEDIUM/LOW 問題

---

## 附錄：已驗證安全機制

| 機制 | 檔案 | 狀態 |
|------|------|------|
| Rate Limiting | `lib/middleware/rate-limiter.ts` | ✅ 完善 |
| Security Headers | `lib/security/headers.ts` | ✅ 完善 |
| URL Redirect Validation | `lib/security/url-validator.ts` | ✅ 完善 |
| Password Strength | `components/ui/PasswordStrength.tsx` | ✅ 完善 |
| CSRF Module | `lib/security/csrf.ts` | ⚠️ 模組存在但未完整套用 |
| PII Redactor | `lib/security/pii-redactor.ts` | ⚠️ 存在但未廣泛使用 |
| Encryption | `lib/security/encryption.ts` | ✅ 存在 |

---

## 結論

系統整體架構良好，但存在 **5 個 CRITICAL** 和 **8 個 HIGH** 級別的安全問題需要優先處理。主要風險集中在：

1. **多租戶資料隔離不完整** - 部分 DAL 函數未驗證 company_id
2. **認證安全性** - Session token 可被 JavaScript 存取，CSRF 未完整實作
3. **輸入驗證不足** - 搜尋、分頁、數值等參數驗證不完整

建議在修復 CRITICAL 問題後，進行滲透測試驗證修復效果。
