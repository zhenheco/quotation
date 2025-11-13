# Spec: D1 資料存取 (D1 Data Access)

## ADDED Requirements

### Requirement: Analytics APIs 完全使用 D1 查詢資料

所有 Analytics API 端點 SHALL 使用 Cloudflare D1 作為唯一資料來源,MUST NOT 使用 Supabase 資料庫查詢。

#### Scenario: 儀表板摘要 API 查詢 D1

**Given** 使用者已通過 Supabase Auth 認證
**When** 呼叫 `GET /api/analytics/dashboard-summary`
**Then** API 使用 `getD1Client(env)` 取得 D1 client
**And** API 呼叫 `getDashboardSummary(db, userId)` DAL 函式
**And** 回傳包含報價單、合約、付款統計的 JSON
**And** 不使用任何 `supabase.from()` 或 `supabase.rpc()` 查詢

#### Scenario: 營收趨勢 API 查詢 D1

**Given** 使用者已通過認證並有 `analytics:read` 權限
**When** 呼叫 `GET /api/analytics/revenue-trend?months=6`
**Then** API 使用 D1 查詢過去 6 個月的報價單資料
**And** 回傳包含每月營收趨勢的 JSON 陣列
**And** 資料與報價單列表完全一致

---

### Requirement: Contracts APIs 完全使用 D1 查詢資料

所有 Contracts API 端點 SHALL 使用 Cloudflare D1,包含複雜查詢如逾期合約、付款進度等,MUST NOT 使用 Supabase 資料庫。

#### Scenario: 取得逾期合約

**Given** 使用者已通過認證
**When** 呼叫 `GET /api/contracts/overdue`
**Then** API 使用 `getOverdueContracts(db, userId)` DAL 函式
**And** DAL 查詢 D1 找出 `end_date < NOW()` 且 `status = 'active'` 的合約
**And** 回傳逾期合約列表
**And** 不使用 Supabase 查詢

#### Scenario: 從報價單建立合約

**Given** 使用者有有效的報價單 ID
**When** 呼叫 `POST /api/contracts/from-quotation` 並提供報價單 ID
**Then** API 使用 `createContractFromQuotation(db, quotationId, userId)` DAL 函式
**And** DAL 從 D1 讀取報價單資料
**And** DAL 在 D1 建立新合約記錄
**And** 回傳新建立的合約

---

### Requirement: Payments APIs 完全使用 D1,包含統計查詢

所有 Payments API 端點 SHALL 使用 D1,特別是原本使用 Supabase RPC 的 `get_payment_statistics` 功能 MUST 改用 DAL 函式實作。

#### Scenario: 付款統計查詢使用 DAL 函式

**Given** 使用者已通過認證
**When** 呼叫 `GET /api/payments/statistics`
**Then** API 使用 `getPaymentStatistics(db, userId)` DAL 函式
**And** DAL 查詢 D1 的 `payments` 表取得所有付款記錄
**And** DAL 在應用層聚合計算 `totalCollected`, `pendingAmount`, `overdueAmount`
**And** 回傳統計資料 JSON
**And** 結果與原 Supabase RPC `get_payment_statistics` 一致
**And** 不使用 `supabase.rpc()`

#### Scenario: 未收款項查詢

**Given** 使用者已通過認證
**When** 呼叫 `GET /api/payments/unpaid`
**Then** API 使用 `getUnpaidPayments(db, userId)` DAL 函式
**And** DAL 查詢 D1 找出 `status = 'pending'` 的付款
**And** 回傳未收款項列表

---

### Requirement: Batch Operations 使用 D1 Batch API

批次操作 API MUST 使用 Cloudflare D1 的 batch API 提高效能。

#### Scenario: 批次更新報價單狀態

**Given** 使用者已通過認證並有 `quotations:write` 權限
**When** 呼叫 `POST /api/quotations/batch/status` 並提供 `quotationIds` 和 `status`
**Then** API 使用 `batchUpdateQuotationStatus(db, quotationIds, status, userId)` DAL 函式
**And** DAL 使用 D1 batch API 同時更新多筆報價單
**And** 回傳成功更新的數量
**And** 不使用 Supabase 查詢

#### Scenario: 批次刪除報價單

**Given** 使用者已通過認證並有 `quotations:delete` 權限
**When** 呼叫 `DELETE /api/quotations/batch/delete` 並提供 `quotationIds`
**Then** API 使用 `batchDeleteQuotations(db, quotationIds, userId)` DAL 函式
**And** DAL 使用 D1 batch API 刪除報價單及其項目
**And** 回傳成功刪除的數量

---

### Requirement: Admin APIs 使用 D1 查詢所有公司和使用者資料

Admin API SHALL 使用 D1 查詢跨公司的資料,但 MUST 保留 Supabase Auth 的使用者認證。

#### Scenario: 取得所有公司列表

**Given** 使用者是 `super_admin`
**When** 呼叫 `GET /api/admin/companies`
**Then** API 檢查使用者角色 (使用 KV cached 權限)
**And** API 使用 `getAllCompanies(db)` DAL 函式
**And** DAL 查詢 D1 的 `companies` 表
**And** 回傳所有公司列表
**And** 不使用 Supabase 資料庫查詢

#### Scenario: 更新使用者角色

**Given** 使用者是管理員
**When** 呼叫 `PUT /api/admin/users/[id]/role` 並提供新的 `roleId`
**Then** API 使用 `updateUserRole(db, userId, roleId)` DAL 函式
**And** DAL 更新 D1 的 `user_roles` 表
**And** DAL 刪除該使用者的 KV 快取權限
**And** 回傳成功訊息

---

### Requirement: RBAC 權限檢查使用 KV 快取 + D1

權限檢查 API MUST 使用 KV 快取優先,未命中時才查詢 D1。

#### Scenario: 權限檢查使用 KV 快取

**Given** 使用者已通過認證
**When** 呼叫 `GET /api/rbac/check-permission?resource=quotations&action=read`
**Then** API 先檢查 KV `user_permissions:{userId}`
**And** 如果 KV 命中,直接返回權限 (1-2ms)
**And** 如果 KV 未命中,查詢 D1 取得角色和權限
**And** 將結果寫入 KV (TTL: 1 小時)
**And** 回傳權限檢查結果
**And** 不使用 Supabase 資料庫查詢

#### Scenario: 取得使用者個人檔案

**Given** 使用者已通過認證
**When** 呼叫 `GET /api/rbac/user-profile`
**Then** API 使用 `getUserProfile(db, userId)` DAL 函式
**And** DAL 查詢 D1 取得使用者角色、權限、公司成員資格
**And** 回傳完整的使用者個人檔案 JSON
**And** 包含 `roles`, `permissions`, `companies` 欄位

---

## REMOVED Requirements

### Requirement: 移除所有 Supabase 資料庫查詢程式碼

所有業務資料查詢的 Supabase 程式碼 MUST 移除,僅保留 Supabase Auth 相關程式碼。

#### Scenario: Analytics API 不再使用 supabase.from()

**Given** 遷移完成後
**When** 檢查 `app/api/analytics/**/*.ts` 檔案
**Then** 所有檔案不包含 `supabase.from(` 呼叫
**And** 所有檔案不包含 `supabase.rpc(` 呼叫
**And** 驗證指令 `grep -r "supabase\.from\(" app/api/analytics/` 無結果

#### Scenario: Contracts/Payments API 不再使用 Supabase 資料庫

**Given** 遷移完成後
**When** 檢查 `app/api/contracts/**/*.ts` 和 `app/api/payments/**/*.ts`
**Then** 所有檔案不包含 `supabase.from(` 呼叫
**And** 驗證指令 `grep -r "supabase\.from\(" app/api/contracts/ app/api/payments/` 無結果

#### Scenario: 移除未使用的 Supabase imports

**Given** 遷移完成後
**When** 執行 `pnpm run lint`
**Then** 無 "unused import" 警告
**And** 所有 `import { createClient } from '@supabase/supabase-js'` 已移除 (除非用於 Auth)
**And** 保留 `import { createApiClient } from '@/lib/supabase/api'` (Auth 用)

---

## MODIFIED Requirements

### Requirement: API Routes 統一使用 Edge Runtime + D1 + KV 模式

所有業務 API routes MUST 採用統一的程式碼模式。

#### Scenario: API Route 標準模式

**Given** 開發新的或遷移現有的 API route
**When** 實作 API handler 函式
**Then** API 必須包含以下程式碼:

```typescript
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext()
  const supabase = createApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getD1Client(env)
  const kv = getKVCache(env)

  const hasPermission = await checkPermission(kv, db, user.id, 'resource:action')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 使用 DAL 查詢資料
  const data = await getSomeData(db, user.id)

  return NextResponse.json(data)
}
```

**And** 不使用任何 `supabase.from()` 或 `supabase.rpc()` 查詢
**And** 所有資料查詢透過 DAL 函式
**And** 權限檢查使用 KV 快取

#### Scenario: 錯誤處理標準化

**Given** API route 遇到錯誤
**When** 捕捉到 exception
**Then** API 記錄完整錯誤到 console.error
**And** 回傳使用者友善的錯誤訊息 (不洩漏內部細節)
**And** 使用適當的 HTTP 狀態碼 (401, 403, 404, 500)

---

## Summary

本 spec 定義了完整遷移至 Cloudflare D1 的核心需求:

1. **新增**: 34 個 API 端點使用 D1 查詢
2. **新增**: 5 個新 DAL 模組 (Analytics, Batch, Admin 等)
3. **移除**: 所有 Supabase 資料庫查詢程式碼
4. **修改**: 統一 API 程式碼模式

每個 Scenario 都可獨立測試和驗證,確保遷移的完整性和正確性。
