# Development Log

## 2026-01-23: 修復訂單頁面顯示 JSON 格式問題

### 問題描述
從報價單建立訂單後，商品明細和報價單備註以 JSON 格式顯示（如 `{"zh":"備註內容","en":""}`），應該顯示純文字。

### 根本原因
1. 報價單的 `notes` 和 `terms` 欄位是 TEXT 類型，但前端傳送 JSONB 物件
2. Supabase 將物件序列化為 JSON 字串儲存
3. 訂單建立函數直接複製這些 JSON 字串
4. 訂單詳情頁面直接顯示字串，未解析 JSON

### 解決方案
修改 `app/orders/[id]/OrderDetailClient.tsx`，使用 `parseNotes` 函數解析：
- `order.notes` → `parseNotes(order.notes)`
- `order.terms` → `parseNotes(order.terms)`
- `item.product_name` → `parseNotes(item.product_name)`

`parseNotes` 函數會自動：
- 解析 JSON 字串（支援雙重序列化）
- 提取 `zh` 欄位的值
- 正確處理換行符

### 影響範圍
- 訂單詳情頁面（`/orders/[id]`）

---

## 2026-01-23: 修復報價單轉訂單功能

### 問題描述
用戶報告：報價單建立好選擇「已接受」後，沒辦法下一步建立訂單

### 根本原因
`scripts/update-db-constraint.sql` 腳本將資料庫 CHECK 約束改為使用 `signed` 狀態，但：
- 前端 UI (`QuotationDetail.tsx`) 使用 `accepted` 狀態
- 後端函數 `create_order_from_quotation` 檢查 `status = 'accepted'`
- 資料庫約束不允許 `accepted`，導致狀態無法正確設定

### 解決方案

1. **建立 migration 修正資料庫約束**
   - 檔案：`supabase/migrations/20260123103300_fix_quotation_status_accepted.sql`
   - 將 `signed` 狀態轉回 `accepted`
   - 重建 CHECK 約束允許正確的狀態值

2. **棄用錯誤的腳本**
   - 更新 `scripts/update-db-constraint.sql` 標記為已棄用

### 影響範圍
- 資料庫 `quotations` 表的 CHECK 約束
- 任何之前錯誤設定為 `signed` 的報價單狀態

---

## 2026-01-02: 會計模組功能完善（第二階段）

### 問題描述
1. 財務報表無資料顯示（即使有已過帳傳票）
2. 缺失 i18n 翻譯鍵：`common.back`、審核/過帳相關鍵
3. 列表頁缺少編輯按鈕
4. 缺少審核（Verify）和過帳（Post）按鈕

### 根本原因

#### 財務報表無資料
RPC 函數返回的欄位名稱與 TypeScript 類型定義不匹配：

| RPC 返回欄位 | TypeScript 期望欄位 |
|-------------|-------------------|
| `category` | `account_category` |
| `debit_total` | `closing_debit` |
| `credit_total` | `closing_credit` |

這導致服務層過濾時 `item.account_category === undefined`，所有資料被過濾掉。

### 解決方案

#### 1. 修復財務報表資料流
修改 `lib/dal/accounting/journals.dal.ts` 的 `getTrialBalanceRpc()` 函數，新增欄位映射：
```typescript
return (data || []).map((item: Record<string, unknown>) => ({
  account_category: item.category as string,     // category → account_category
  closing_debit: Number(item.debit_total) || 0,  // debit_total → closing_debit
  closing_credit: Number(item.credit_total) || 0, // credit_total → closing_credit
  // ...
}))
```

#### 2. 補齊 i18n 翻譯鍵
修改 `messages/zh.json` 和 `messages/en.json`：
- `common.back`: 返回
- `accounting.verify`: 審核
- `accounting.post`: 過帳
- `accounting.confirmVerify`, `accounting.confirmPost`: 確認訊息
- `accounting.journals.total`, `transactionDescription`, `postingInfo` 等

#### 3. 列表頁新增編輯按鈕
修改檔案：
- `app/[locale]/accounting/invoices/InvoiceList.tsx`
- `app/[locale]/accounting/journals/JournalList.tsx`

邏輯：
- 發票：非作廢狀態顯示編輯按鈕
- 傳票：僅草稿狀態顯示編輯按鈕

#### 4. 新增審核/過帳按鈕
**詳情頁：**
- `InvoiceDetailClient.tsx` - 草稿顯示審核按鈕，已審核顯示過帳按鈕
- `JournalDetailClient.tsx` - 草稿顯示過帳按鈕

**列表頁：**
- `InvoiceList.tsx` - 同上邏輯
- `JournalList.tsx` - 草稿顯示過帳按鈕

### 影響範圍
- 財務報表（試算表、損益表、資產負債表）現可正常顯示資料
- 發票與傳票列表頁新增編輯、審核、過帳操作
- 發票與傳票詳情頁新增審核、過帳操作
- i18n 翻譯完整

---

## 2026-01-02: 新增發票/傳票編輯功能與修復財務報表錯誤

### 問題描述
會計模組存在以下問題：
1. 財務報表顯示 `Cannot read properties of undefined (reading 'map')` 錯誤
2. 發票管理缺少編輯功能（只有檢視）
3. 傳票管理缺少編輯功能（只有檢視）
4. 發票/傳票詳情頁缺少部分 i18n 翻譯

### 根本原因

#### 財務報表錯誤
服務層返回格式與前端期望不匹配：

| 服務層返回 | 前端期望 |
|-----------|---------|
| `{ revenue: TrialBalanceItem[], ... }` | `{ revenue: { items: [...], total }, ... }` |

#### 編輯功能缺失
- 發票：API 和 Hook 已存在，但缺少編輯頁面 UI
- 傳票：API、Hook 和編輯頁面 UI 皆未實作

### 解決方案

#### 1. 修復財務報表（API 格式調整）
修改 `lib/services/accounting/journal.service.ts`：
- `generateIncomeStatement()` 返回 `{ revenue: { items, total }, expenses: { items, total }, netIncome }`
- `generateBalanceSheet()` 返回 `{ assets: { items, total }, liabilities: { items, total }, equity: { items, total } }`

#### 2. 新增發票編輯功能
**新增檔案：**
- `app/[locale]/accounting/invoices/[id]/edit/page.tsx`
- `app/[locale]/accounting/invoices/[id]/edit/InvoiceEditClient.tsx`

**修改檔案：**
- `app/[locale]/accounting/invoices/[id]/InvoiceDetailClient.tsx` - 加入編輯按鈕
- `lib/dal/accounting/invoices.dal.ts` - 修改 `updateInvoice()` 權限邏輯

**編輯權限：**
| 狀態 | 可編輯欄位 |
|------|-----------|
| VOIDED | 不可編輯 |
| DRAFT | 所有欄位 |
| VERIFIED/POSTED | 僅 description、due_date |

#### 3. 新增傳票編輯功能
**新增檔案：**
- `app/[locale]/accounting/journals/[id]/edit/page.tsx`
- `app/[locale]/accounting/journals/[id]/edit/JournalEditClient.tsx`

**修改檔案：**
- `app/[locale]/accounting/journals/[id]/JournalDetailClient.tsx` - 加入編輯按鈕（僅草稿顯示）
- `lib/dal/accounting/journals.dal.ts` - 新增 `updateJournalEntry()` 函數
- `app/api/accounting/journals/[id]/route.ts` - 新增 PUT handler
- `hooks/accounting/use-journals.ts` - 新增 `useUpdateJournal` hook

**編輯權限：**
- 只有 DRAFT 狀態可編輯
- 已過帳/已作廢需透過作廢+新建處理

#### 4. 補齊 i18n 翻譯
在 `messages/zh.json` 和 `messages/en.json` 新增：
- `accounting.invoices.detail/edit/partialEdit/editNotAllowed`
- `accounting.journals.detail/edit/draftOnly/balanced/imbalanced`
- 其他欄位標籤翻譯

### 修改的檔案清單

| 檔案 | 變更內容 |
|------|---------|
| `lib/services/accounting/journal.service.ts` | 修復報表返回格式 |
| `lib/dal/accounting/invoices.dal.ts` | 修改 updateInvoice 權限邏輯 |
| `lib/dal/accounting/journals.dal.ts` | 新增 updateJournalEntry 函數 |
| `app/api/accounting/journals/[id]/route.ts` | 新增 PUT handler |
| `hooks/accounting/use-journals.ts` | 新增 useUpdateJournal hook |
| `hooks/accounting/index.ts` | 匯出 useUpdateJournal |
| `app/[locale]/accounting/invoices/[id]/InvoiceDetailClient.tsx` | 加入編輯按鈕 |
| `app/[locale]/accounting/invoices/[id]/edit/page.tsx` | 新增 |
| `app/[locale]/accounting/invoices/[id]/edit/InvoiceEditClient.tsx` | 新增 |
| `app/[locale]/accounting/journals/[id]/JournalDetailClient.tsx` | 加入編輯按鈕 |
| `app/[locale]/accounting/journals/[id]/edit/page.tsx` | 新增 |
| `app/[locale]/accounting/journals/[id]/edit/JournalEditClient.tsx` | 新增 |
| `messages/zh.json` | 補齊翻譯 |
| `messages/en.json` | 補齊翻譯 |

### 設計考量
- **發票採用漸進式權限**：DRAFT 全開放 → 非草稿部分開放 → VOIDED 禁止
- **傳票採用嚴格權限**：只有 DRAFT 可編輯，符合會計準則中對已過帳憑證不可修改的要求
- **傳票編輯包含分錄管理**：支援新增/刪除分錄行、借貸平衡驗證

---

## 2026-01-01: 修復會計系統 API 403 Forbidden 錯誤

### 問題描述
會計發票和傳票頁面返回 403 Forbidden 錯誤，Console 顯示：
- `GET /api/accounting/invoices?company_id=xxx 403 (Forbidden)`
- `GET /api/accounting/journals?company_id=xxx 403 (Forbidden)`
- `MISSING_MESSAGE: common.error (zh)`

### 根本原因
**權限名稱不匹配**：API 路由使用的權限名稱與資料庫定義的權限名稱不一致。

| API 路由使用 | 資料庫定義 |
|-------------|-----------|
| `invoices:read` | `acc_invoices:read` |
| `journals:read` | `journal_entries:read` |

`lib/api/middleware.ts` 的 `permissionMapping` 只有 3 個映射，缺少所有會計相關映射。

### 權限檢查流程分析
```
API 請求 → withAuth('invoices:read')
       ↓
checkPermission() 查詢用戶權限（如 acc_invoices:read）
       ↓
直接匹配 'invoices:read' ❌ 找不到
       ↓
查找 permissionMapping['invoices:read'] ❌ 沒有此映射
       ↓
return false → 403 Forbidden
```

### 解決方案
在 `lib/api/middleware.ts` 的 `permissionMapping` 補充會計權限映射：

```typescript
const permissionMapping: Record<string, string[]> = {
  // 現有映射...

  // 會計發票（API: invoices → DB: acc_invoices）
  'invoices:read': ['acc_invoices:read'],
  'invoices:write': ['acc_invoices:write'],
  'invoices:delete': ['acc_invoices:delete'],
  'invoices:post': ['acc_invoices:post'],

  // 會計傳票（API: journals → DB: journal_entries）
  'journals:read': ['journal_entries:read'],
  'journals:write': ['journal_entries:write'],
  // ...
}
```

同時添加缺失的翻譯鍵 `common.error`。

### 修改的檔案
| 檔案 | 修改內容 |
|-----|---------|
| `lib/api/middleware.ts` | 添加 15 個會計權限映射 |
| `messages/zh.json` | 添加 `"error": "錯誤"` |
| `messages/en.json` | 添加 `"error": "Error"` |

### 排錯指南（未來遇到 403 問題時）
1. 確認 `withAuth('xxx:read')` 中的權限名稱
2. 檢查 `permissionMapping` 是否有對應映射
3. 確認資料庫 `permissions` 表中是否有該權限
4. 驗證用戶角色權限：
```sql
SELECT p.name FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.user_id = '用戶UUID';
```

---

## 2026-01-01: 修復 useCompany hook 無法取得公司資料問題

### 問題描述
用戶反映在會計發票頁面看不到任何資料。

### 根本原因
`hooks/useCompany.ts` 嘗試查詢 `user_profiles.company_id` 欄位，但該欄位在資料庫中**不存在**。

正確的用戶-公司關聯是透過 `company_members` 表建立的，不是 `user_profiles.company_id`。

```
錯誤設計：
user_profiles.company_id → companies.id  ❌ (欄位不存在)

正確設計：
company_members.user_id → users
company_members.company_id → companies  ✅
```

### 解決方案
修改 `hooks/useCompany.ts`，改為查詢 `company_members` 表：

```typescript
// 透過 company_members 取得使用者的公司
const { data: membership } = await supabase
  .from('company_members')
  .select(`
    company_id,
    is_owner,
    companies:company_id (*)
  `)
  .eq('user_id', user.id)
  .eq('is_active', true)
  .order('is_owner', { ascending: false })
  .limit(1)
  .single()
```

### 影響範圍
所有使用 `useCompany()` hook 的頁面：
- 會計發票頁面
- 會計傳票頁面
- 財務報表頁面
- 公司設定頁面

### 經驗教訓
1. 資料庫 schema 與前端 hook 必須同步驗證
2. 多表關聯時，確認正確的 join path
3. `user_profiles` 表沒有 `company_id`，公司關聯在 `company_members`

---

## 2026-01-01: 修復 Logo 上傳失敗問題（Storage Bucket 不存在）

### 問題描述
用戶反映上傳 logo 時出現 500 錯誤。Console 顯示：
- `StorageApiError: Bucket not found (status 404)`
- `user_profiles?select=company_id` 400 錯誤
- `/api/upload/company-files` 500 錯誤

### 根本原因
程式碼從 Cloudflare R2 遷移到 Supabase Storage 時，**漏掉創建 `company-files` bucket**。
- `app/api/upload/company-files/route.ts` 和 `app/api/storage/company-files/route.ts` 都嘗試存取不存在的 bucket
- 原本使用 `createApiClient(request)`（anon key），需要 RLS policies 才能存取 Storage

### 解決方案

#### 1. 創建 Storage Bucket
新增 `scripts/setup-company-files-bucket.ts`：
```bash
npx tsx scripts/setup-company-files-bucket.ts
```

Bucket 設定：
- Name: `company-files`
- Public: `false`（私有）
- File Size Limit: `5MB`
- Allowed MIME Types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`

#### 2. 修改 API 使用 Service Role（繞過 RLS）
因為 API 層已有安全檢查，改用 Service Role key 更簡單：

**`app/api/upload/company-files/route.ts`**：
```typescript
// 使用 API client 驗證用戶身份
const authClient = createApiClient(request)
const { data: { user } } = await authClient.auth.getUser()

// 使用 Service Role client 進行 Storage 操作（繞過 RLS）
const storageClient = getSupabaseClient()
const { error: uploadError } = await storageClient.storage
  .from('company-files')
  .upload(filePath, arrayBuffer, { ... })
```

**`app/api/storage/company-files/route.ts`**：
```typescript
// 安全性由上面的路徑所有權驗證保證
if (!path.startsWith(user.id + '/')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

const storageClient = getSupabaseClient()
const { data, error } = await storageClient.storage
  .from('company-files')
  .download(path)
```

### 新增/修改檔案

| 檔案 | 變更 |
|------|------|
| `scripts/setup-company-files-bucket.ts` | 新增：Bucket 設定腳本 |
| `app/api/upload/company-files/route.ts` | 修改：使用 Service Role |
| `app/api/storage/company-files/route.ts` | 修改：使用 Service Role |
| `tests/mocks/supabase.ts` | 修改：新增 Storage mock |
| `tests/integration/storage/company-files-bucket.test.ts` | 新增：Bucket 存在性測試 |
| `tests/unit/upload-company-files.test.ts` | 新增：上傳驗證邏輯測試 |
| `tests/unit/storage-company-files.test.ts` | 新增：下載驗證邏輯測試 |

### 驗證結果
- ✅ Bucket 創建成功
- ✅ 所有 131 個測試通過
- ✅ TypeScript 檢查通過
- ⏳ 待手動測試：用戶上傳 logo 並顯示

### 經驗教訓
1. 遷移 Storage provider 時，**必須確認 bucket 已創建**
2. 使用 Service Role 繞過 RLS 是有效方案，但需確保 API 層有足夠的安全檢查
3. `createApiClient(request)` 使用 anon key + user session，需要 RLS policies
4. `getSupabaseClient()` 使用 Service Role key，繞過 RLS

---

## 2025-12-28: 建立會計系統測試資料

### 目的
建立測試資料供會計系統前端功能驗證使用。

### 建立的測試資料

| 資料類型 | 筆數 | 說明 |
|---------|-----|------|
| 會計科目 (accounts) | 33 | 1xxx 資產 / 2xxx 負債 / 3xxx 權益 / 4xxx 收入 / 5xxx 成本 / 6xxx 費用 |
| 往來對象 (counterparties) | 2 | 測試供應商 A (VENDOR) + 測試客戶 B (CUSTOMER) |
| 發票 (acc_invoices) | 4 | 2 進項 (DRAFT/VERIFIED) + 2 銷項 (DRAFT/POSTED) |
| 傳票 (journal_entries) | 2 | JV-2024-001 (POSTED) + JV-2024-002 (DRAFT) |
| 分錄 (acc_transactions) | 6 | 借貸平衡的會計分錄 |

### 發票測試資料
| 編號 | 類型 | 狀態 | 金額 | 往來對象 |
|------|------|------|------|---------|
| AA-000001 | INPUT | DRAFT | $10,500 | 測試供應商 A |
| AA-000002 | INPUT | VERIFIED | $21,000 | 測試供應商 A |
| BB-000001 | OUTPUT | DRAFT | $15,750 | 測試客戶 B |
| BB-000002 | OUTPUT | POSTED | $31,500 | 測試客戶 B |

### 傳票測試資料
| 傳票編號 | 日期 | 狀態 | 分錄內容 |
|---------|------|------|---------|
| JV-2024-001 | 2024-12-25 | POSTED | 借:應收帳款 31,500 / 貸:銷貨收入 30,000 + 銷項稅額 1,500 |
| JV-2024-002 | 2024-12-20 | DRAFT | 借:銷貨成本 20,000 + 進項稅額 1,000 / 貸:應付帳款 21,000 |

### 測試公司
振禾有限公司 (ID: `9a987505-5044-493c-bb63-cba891bb79df`)

---

## 2025-12-26: 修復會計系統前端 i18n 和新增頁面

### 問題
會計系統前端有多個問題導致無法正常使用：
1. i18n 翻譯鍵缺失（顯示 `MISSING_MESSAGE: common.noData`）
2. 新增發票/傳票頁面不存在（返回 404）
3. 翻譯鍵名稱不一致（頁面用 `createNew` 但翻譯檔定義 `addNew`）

### 解決方案

**i18n 修復**：
- `messages/zh.json` - 新增 `common.noData: "無資料"`
- `messages/en.json` - 新增 `common.noData: "No data"`
- 修正頁面翻譯鍵：`createNew` → `addNew`

**新增發票頁面**：
- `app/[locale]/accounting/invoices/new/page.tsx` - Server component
- `app/[locale]/accounting/invoices/InvoiceForm.tsx` - 發票表單（類型、金額、稅額自動計算）

**新增傳票頁面**：
- `app/[locale]/accounting/journals/new/page.tsx` - Server component
- `app/[locale]/accounting/journals/JournalForm.tsx` - 傳票表單（動態分錄行、借貸平衡驗證）

**表單翻譯鍵**：
- 在 `accounting.form` 區塊新增 18 個翻譯鍵（中/英）

### 影響範圍
- 發票管理頁面：新增按鈕可正常導向表單
- 會計傳票頁面：新增按鈕可正常導向表單
- i18n：`common.noData` 顯示正確翻譯

---

## 2025-12-26: 修復會計系統 RPC 函數與資料表結構不匹配問題

### 問題
會計系統從 account 專案 migration 過來時，RPC 函數 (Migration 047) 與實際資料表結構 (Migration 044) 完全不匹配，導致所有 RPC 函數執行失敗。

### 根本原因
RPC 函數是基於舊版 schema 設計，使用了多個不存在的欄位：
- `journal_entries`: `source_id`, `total_amount`, `created_by` ❌
- `acc_invoices`: `journal_entry_id`, `posted_at`, `posted_by`, `voided_at`, `voided_by`, `void_reason` ❌
- `bank_transactions`: `matched_journal_entry_id`, `matched_at`, `matched_by` ❌
- `invoice_payments` 表完全不存在 ❌
- 類型 `journal_source_type` 不存在（實際是 `transaction_source`）

### 解決方案

**遷移 048**：`migrations/048_fix_accounting_schema.sql`
- 補充 `acc_invoices` 表 6 個欄位
- 補充 `bank_transactions` 表 3 個欄位
- 新建 `invoice_payments` 表（含 RLS 政策和權限）

**遷移 049**：`migrations/049_rewrite_accounting_rpc.sql`
- 重寫所有 8 個 RPC 函數，與新 schema 一致

**DAL 層更新**：
- `lib/dal/accounting/invoices.dal.ts` - 新增 6 個欄位類型
- `lib/dal/accounting/journals.dal.ts` - 修正 RPC 參數（`invoice_id`, `is_auto_generated`）
- `lib/dal/accounting/bank-accounts.dal.ts` - 新增 3 個欄位類型

**Service 層更新**：
- `lib/services/accounting/journal.service.ts` - 更新 `CreateJournalRequest` 接口
- `app/api/accounting/journals/route.ts` - 移除不存在的 `created_by` 參數

### 驗證結果
- ✅ TypeScript 類型檢查通過
- ✅ Migration 048 執行成功
- ✅ Migration 049 執行成功

---

## 2025-12-24: 修復 Supabase Security Advisor 報告的 6 個錯誤

### 問題
Supabase Security Advisor 報告 6 個安全錯誤。

### 根本原因
6 個視圖授予了 `anon`（匿名/未認證）角色完整存取權限：
- `collected_payments_summary`
- `next_collection_reminders`
- `overdue_payments`
- `unpaid_payments_30_days`
- `upcoming_payments`
- `user_permissions`

雖然這些視圖都有 `WHERE ... auth.uid()` 過濾，但 `anon` 角色不應該有任何存取權限。

### 解決方案

**遷移 050**：`migrations/050_fix_view_security.sql`
- 撤銷 `anon` 角色對所有 6 個視圖的權限
- 限制 `authenticated` 和 `service_role` 只有 SELECT 權限

**遷移 051**：`migrations/051_cleanup_pos_functions.sql`
- 清理 049 遷移中因參數簽名不符而未刪除的 8 個 POS 函數

### 驗證結果
- ✅ `anon` 角色已無法存取任何視圖
- ✅ `authenticated` 和 `service_role` 只有 SELECT 權限
- ✅ 8 個遺漏的 POS 函數已刪除

**遷移 052**：`migrations/052_harden_function_security.sql`
- 撤銷 `PUBLIC` 對 `get_auth_users_metadata` 和 `verify_user_pin` 的執行權限
- 修改這兩個函數加入 `auth.uid()` 認證檢查
- `get_auth_users_metadata` 現在只能查詢同公司成員
- `verify_user_pin` 現在只能驗證自己的 PIN

---

## 2025-12-21: 移除 POS 系統功能

### 目的
系統將專注於報價單、會計系統和報表分析，不再需要 POS（Point of Sale）功能。

### 刪除範圍

| 類別 | 說明 |
|------|------|
| 頁面 | `app/[locale]/pos/` - 8 個檔案 |
| API | `app/api/pos/` - 15 個 API 路由 |
| DAL | `lib/dal/pos/` - 6 個資料存取層檔案 |
| Services | `lib/services/pos/` - 3 個服務層檔案 |
| Hooks | `hooks/pos/` - 4 個 React Query hooks |
| 導航 | `components/Sidebar.tsx` - 移除 POS 導航區塊 |
| i18n | `messages/*.json` - 移除 POS 翻譯區段 |

### 資料庫變更

新增遷移腳本 `migrations/049_drop_pos_system.sql`：

**刪除 19 張表格**（按依賴順序）：
- 交易相關：`transaction_commissions`, `transaction_payments`, `transaction_items`
- 銷售主表：`sales_transactions`, `daily_settlements`
- 會員相關：`member_deposits`, `deposit_promotions`, `pos_members`, `member_levels`
- 員工相關：`commission_rules`, `staff_schedules`, `pos_staff`
- 服務相關：`service_package_services`, `service_packages`, `pos_services`, `service_categories`
- 租戶相關：`branches`, `user_tenants`, `tenants`

**刪除 8 個 POS 專用枚舉**：
- `tenant_plan`, `staff_role`, `schedule_status`, `commission_type`
- `deposit_promotion_type`, `sales_status`, `discount_type`, `settlement_status`

**保留共用枚舉**：
- `payment_method_type`（會計系統使用）
- `gender`（可能被客戶系統使用）

### 驗證結果
- ✅ `pnpm run typecheck` - 通過
- ✅ `pnpm run lint` - 通過
- ✅ `pnpm run build` - 建置成功

### 已完成
- ✅ 資料庫遷移 `migrations/049_drop_pos_system.sql` 已於 2025-12-21 執行完成

---

## 2025-12-19: 修復頁面切換黑屏問題（第四次 - 成功）

### 問題描述
- 切換到供應商、客戶、報價單、合約、付款等頁面時會先閃一下黑屏
- **關鍵觀察**：會計和 POS 模組沒有此問題

### 真正的根本原因（深入分析）

經過與無問題頁面（會計/POS）的詳細對比，發現**兩個關鍵差異**：

#### 差異 1：Page 組件類型

| 頁面類型 | 組件類型 | 翻譯方式 |
|---------|---------|---------|
| `accounting/invoices/page.tsx` | **Server** (`async`) | `await getTranslations()` |
| `pos/members/page.tsx` | **Server** (`async`) | `await getTranslations()` |
| `suppliers/page.tsx` | **Client** (`'use client'`) | `useTranslations()` hook |
| `customers/page.tsx` | **Client** (`'use client'`) | `useTranslations()` hook |

#### 差異 2：Loading 組件結構

| 頁面類型 | Loading 方式 | 問題 |
|---------|-------------|------|
| `accounting/loading.tsx` | 內嵌 HTML + CSS | ✅ 即時渲染 |
| `pos/loading.tsx` | 內嵌 HTML + CSS | ✅ 即時渲染 |
| `suppliers/loading.tsx` | `import { ListPageSkeleton }` | ❌ 需要 hydration |

#### 為什麼會黑屏

1. `ListPageSkeleton` 在 `components/ui/Skeleton.tsx` 是 `'use client'` 組件
2. loading.tsx 匯入 client 組件 → 需要等待 hydration
3. hydration 完成前，畫面是空白（黑屏）
4. 會計/POS 的 loading.tsx 用內嵌 HTML，不需要 hydration，所以即時顯示

### 解決方案

#### Phase 1：修改 7 個 loading.tsx（移除 client component import）

**修改前：**
```tsx
import { ListPageSkeleton } from '@/components/ui/Skeleton'

export default function SuppliersLoading() {
  return <ListPageSkeleton />
}
```

**修改後：**
```tsx
export default function SuppliersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-32" />
        <div className="h-10 bg-gray-200 rounded w-28" />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="h-4 bg-gray-200 rounded w-full mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  )
}
```

**修改的 7 個檔案：**
- `app/[locale]/suppliers/loading.tsx`
- `app/[locale]/customers/loading.tsx`
- `app/[locale]/products/loading.tsx`
- `app/[locale]/quotations/loading.tsx`
- `app/[locale]/contracts/loading.tsx`
- `app/[locale]/payments/loading.tsx`
- `app/[locale]/settings/loading.tsx`

#### Phase 2：修改 5 個 page.tsx 為 Server Component

**修改前（Client Component）：**
```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'

export default function SuppliersPage() {
  const t = useTranslations()
  const params = useParams()
  const locale = params.locale as string
  // ...
}
```

**修改後（Server Component）：**
```tsx
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SuppliersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const t = await getTranslations()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    // ... 內容保持不變
  )
}
```

**修改的 5 個 page.tsx 檔案：**
- `app/[locale]/suppliers/page.tsx`
- `app/[locale]/customers/page.tsx`
- `app/[locale]/products/page.tsx`
- `app/[locale]/contracts/page.tsx`
- `app/[locale]/payments/page.tsx`

#### Phase 3：為複雜頁面建立 Client Component

對於 contracts 和 payments 這類有複雜互動邏輯的頁面，建立獨立的 Client Component：

- `app/[locale]/contracts/ContractsClient.tsx` - 合約列表互動邏輯
- `app/[locale]/payments/PaymentsClient.tsx` - 付款頁面互動邏輯

### 修改檔案清單

| 檔案 | 修改內容 |
|------|---------|
| `app/[locale]/suppliers/loading.tsx` | 內嵌 HTML skeleton |
| `app/[locale]/customers/loading.tsx` | 內嵌 HTML skeleton |
| `app/[locale]/products/loading.tsx` | 內嵌 HTML skeleton |
| `app/[locale]/quotations/loading.tsx` | 內嵌 HTML skeleton |
| `app/[locale]/contracts/loading.tsx` | 內嵌 HTML skeleton |
| `app/[locale]/payments/loading.tsx` | 內嵌 HTML skeleton |
| `app/[locale]/settings/loading.tsx` | 內嵌 HTML skeleton |
| `app/[locale]/suppliers/page.tsx` | 改為 async server component |
| `app/[locale]/customers/page.tsx` | 改為 async server component |
| `app/[locale]/products/page.tsx` | 改為 async server component |
| `app/[locale]/contracts/page.tsx` | 改為 async server component |
| `app/[locale]/payments/page.tsx` | 改為 async server component |
| `app/[locale]/contracts/ContractsClient.tsx` | 新增，合約互動邏輯 |
| `app/[locale]/payments/PaymentsClient.tsx` | 新增，付款互動邏輯 |

### 相關提交
- `99bd8d1` - fix: 修復黑屏閃爍問題（第四次修復）

### 經驗教訓
1. **loading.tsx 不應該 import client component**：會導致 hydration 延遲，造成黑屏
2. **page.tsx 使用 Server Component + Client List Component 模式**：與會計/POS 架構保持一致
3. **用內嵌 HTML 寫 skeleton**：不需要 hydration，即時顯示
4. **對比正常/異常頁面找差異**：這是找出根本原因的最有效方法

---

## 2025-12-19: 修復頁面切換黑屏問題（第三次 - 無效）

### 問題描述
- 切換到供應商、客戶、報價單等頁面時會先閃一下黑屏
- 側邊欄位置已經統一（第二次修復成功）
- 會計/POS 模組 i18n 翻譯已完成

### 根本原因（錯誤診斷）
`app/loading.tsx` 和 `app/[locale]/loading.tsx` 使用 `bg-gray-50`，但主布局使用 `bg-background` CSS 變數。
這種背景色不一致導致頁面切換時產生視覺閃爍。

### 解決方案（無效）
統一 loading 組件的背景色為 CSS 變數：

| 檔案 | 原本 | 修正後 |
|------|------|--------|
| `app/loading.tsx` | `bg-gray-50` | `bg-background` |
| `app/[locale]/loading.tsx` | `bg-gray-50` | `bg-muted/10` |

同時將硬編碼的顏色改為 CSS 變數：
- `border-blue-600` → `border-primary`
- `text-gray-500` → `text-muted-foreground`

### 修改檔案
- `app/loading.tsx`
- `app/[locale]/loading.tsx`

### 相關提交
- `d4c93ef` - fix: 修復頁面切換黑屏問題 - 統一 loading 組件背景色

### 結論
此修復方向錯誤，問題根本原因不是背景色，而是 loading.tsx import client component 導致 hydration 延遲。見第四次修復。

---

## 2025-12-18: 新增名片掃描 OCR 功能

### 功能描述
在客戶新增/編輯頁面加入「掃描名片」按鈕，使用 AI 視覺模型（Qwen-VL-Plus / GLM-4.6V）識別名片上的聯絡資訊，自動填入表單欄位。

### 技術架構
```
前端 → API Route → Cloudflare AI Gateway → OpenRouter → Qwen-VL / GLM-4.6V
```

- **主要模型**：Qwen-VL-Plus（中文識別最佳，$0.21/百萬 tokens）
- **Fallback**：GLM-4.6V（$0.30/百萬 tokens）
- 透過 Cloudflare AI Gateway 代理（可選），提供緩存、監控、限流
- 統一使用 OpenRouter API（OpenAI 兼容格式）

### 使用流程
1. 用戶點擊「掃描名片」按鈕
2. 選擇/拍攝名片圖片（自動壓縮到 1MB 以下）
3. 上傳到 API 進行 OCR 識別
4. 顯示預覽對話框，讓用戶確認/修改
5. 確認後自動填入表單（姓名、Email、電話、傳真、地址）

### 新增檔案
- `lib/cloudflare/ai-gateway.ts` - AI Gateway 認證模組（參考 Auto-pilot-SEO）
- `lib/services/business-card-ocr.ts` - OCR 服務（帶 Fallback）
- `app/api/ocr/business-card/route.ts` - API 端點
- `app/[locale]/customers/BusinessCardScanner.tsx` - 掃描按鈕組件
- `app/[locale]/customers/BusinessCardPreview.tsx` - 預覽對話框

### 修改檔案
- `app/[locale]/customers/CustomerForm.tsx` - 整合掃描功能
- `messages/en.json` - 英文翻譯
- `messages/zh.json` - 中文翻譯
- `.env.local.example` - 環境變數範例

### 環境變數（使用 AI Gateway BYOK 模式）
```env
# Cloudflare AI Gateway（參考 Auto-pilot-SEO）
CF_AI_GATEWAY_ENABLED=true
CF_AI_GATEWAY_ACCOUNT_ID=your-account-id
CF_AI_GATEWAY_ID=your-gateway-name
CF_AI_GATEWAY_TOKEN=your-gateway-token
```

### 參考資料
- [Qwen-VL-Plus on OpenRouter](https://openrouter.ai/qwen/qwen-vl-plus)
- [GLM-4.6V on OpenRouter](https://openrouter.ai/z-ai/glm-4.6v)
- [Cloudflare AI Gateway + OpenRouter](https://developers.cloudflare.com/ai-gateway/usage/providers/openrouter/)

---

## 2025-12-15: 修復黑屏問題（API 端點遺漏）

### 問題描述
- quote24.cc 上會計系統和 POS 系統頁面全部顯示黑色
- 頁面切換時先黑一片才變白
- Console 錯誤：`GET /api/roles 404`、`GET /api/auth/me 404`

### 根本原因
Account-system 合併到 quotation-system 時，前端代碼調用的 API 端點沒有建立：
- `CompanySettings.tsx` 調用 `/api/roles` 但端點不存在
- 多個頁面調用 `/api/auth/me` 但只有 `/api/me` 存在

### 解決方案

#### 1. 建立缺少的 API 端點
- `app/api/roles/route.ts` - 角色列表 API（含資料格式轉換：name_zh/name_en → display_name）
- `app/api/auth/me/route.ts` - 當前用戶 API

#### 2. 補充 loading.tsx 組件
- `app/loading.tsx` - 全局 loading
- `app/[locale]/loading.tsx` - Locale 層級（已存在）
- `app/[locale]/accounting/loading.tsx` - 會計模組
- `app/[locale]/pos/loading.tsx` - POS 模組
- `app/[locale]/settings/loading.tsx` - 設定頁面

### 影響檔案
- `/app/api/roles/route.ts` (新增)
- `/app/api/auth/me/route.ts` (新增)
- `/app/loading.tsx` (新增)
- `/app/[locale]/accounting/loading.tsx` (新增)
- `/app/[locale]/pos/loading.tsx` (新增)
- `/app/[locale]/settings/loading.tsx` (新增)

### 第二次修復（同日）
問題仍然存在，進一步調查發現：
1. 會計和 POS 頁面缺少 layout.tsx（沒有 Sidebar、Header）
2. CSS `body { background: var(--background) }` 使用錯誤（應為 `hsl(var(--background))`）

額外修復：
- 新增 `accounting/layout.tsx`、`pos/layout.tsx`
- 修正 `globals.css` body 背景為 `hsl(var(--background))`

### 經驗教訓
合併系統時必須完整檢查：
1. 前端調用的所有 API 端點是否存在
2. 資料庫 schema 與 API 回傳格式是否匹配
3. 各頁面路由是否有 loading.tsx 處理過渡狀態
4. 各功能模組是否有正確的 layout.tsx 提供共用 UI（Sidebar、Header）
5. CSS 變數使用是否正確（HSL 格式需要包裝）

---

## 2025-12-15: Account-system 整合至 quotation-system（會計 + POS 模組）

### 背景
將 Account-system（會計系統 + POS 系統）完整整合到 quotation-system，採用 Cloudflare Workers + Supabase Client 架構。

### 整合範圍

#### 會計模組
- 發票管理（invoices）- CRUD + 審核/過帳/作廢/付款
- 會計傳票（journals）- CRUD + 過帳/作廢
- 財務報表（reports）- 試算表/損益表/資產負債表

#### POS 模組
- 銷售交易（sales）- 列表/結帳/作廢/退款/報表
- 日結帳（settlements）- 開始/點鈔/審核/鎖定
- 會員管理（members）- CRUD + 儲值/扣款/餘額

### 建立的檔案

#### API Routes（15 個）
```
app/api/accounting/
├── invoices/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── verify/route.ts
│       ├── post/route.ts
│       ├── void/route.ts
│       └── payment/route.ts
├── journals/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── post/route.ts
│       └── void/route.ts
└── reports/
    ├── trial-balance/route.ts
    ├── income-statement/route.ts
    └── balance-sheet/route.ts

app/api/pos/
├── sales/
│   ├── route.ts
│   ├── report/route.ts
│   └── [id]/
│       ├── route.ts
│       ├── void/route.ts
│       └── refund/route.ts
├── settlements/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── count/route.ts
│       ├── approve/route.ts
│       └── lock/route.ts
└── members/
    ├── route.ts
    └── [id]/
        ├── route.ts
        ├── deposit/route.ts
        └── balance/route.ts
```

#### React Query Hooks（7 個）
```
hooks/accounting/
├── use-invoices.ts
├── use-journals.ts
├── use-reports.ts
└── index.ts

hooks/pos/
├── use-sales.ts
├── use-settlements.ts
├── use-members.ts
└── index.ts
```

### 修復的 TypeScript 錯誤

1. **middleware.ts**
   - `kv.set(key, value, 300)` → `kv.set(key, value, { ttl: 300 })`
   - `getCloudflareContext() as { env }` → `as unknown as { env }`
   - `CloudflareEnv.KV_CACHE` → `CloudflareEnv.KV`

2. **Hooks**
   - `response.json()` 類型錯誤 → 使用 `as { error?: string }` 類型斷言
   - `Record<string, unknown>` 相容性 → 改用 `object` 類型
   - 缺少類型定義 → 在 hooks 檔案本地定義

3. **Service 層**
   - 移除未使用的 imports（`InvoiceType`, `InvoiceStatus`, `voidInvoice`, `SettlementStatus`）
   - Export 未使用的介面（`EncryptionKeyRecord`）

### 驗證結果
- ✅ `pnpm run lint` - 通過
- ✅ `pnpm run typecheck` - 通過

### 架構特色

#### API Route 權限檢查
```typescript
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { env } = await getCloudflareContext() as unknown as { env: CloudflareEnv }
  const { kv, db, user, error } = await validateRequest(request, env)

  const hasPermission = await checkPermission(kv, db, user.id, 'accounting:invoices:read')
  if (!hasPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 業務邏輯...
}
```

#### React Query Hooks 快取策略
- 列表數據：30 秒 staleTime
- 單筆數據：無快取（即時）
- 報表數據：60 秒 staleTime

### 待辦
- 建立前端頁面（Dashboard UI）
- 執行資料庫 RPC 函數遷移
- 完整端對端測試

---

## 2025-12-15: 供應商獨立化重構

### 背景
供應商原本依附於產品下，以文字輸入方式儲存在 `product_supplier_costs` 表。此設計有以下問題：
- 同一供應商可能有多個產品，重複輸入資料
- 無法統一管理供應商資訊（聯絡人、銀行帳戶等）
- 容易產生資料不一致（同供應商不同名稱）

### 新架構
```
suppliers (新表)
    ↓
product_supplier_costs.supplier_id (外鍵)
    ↓
products
```

### 實作內容

#### 1. 資料庫遷移 (`migrations/042_supplier_independence.sql`)
- 建立 `suppliers` 表（含多語名稱、聯絡人、銀行資訊等）
- 修改 `product_supplier_costs` 新增 `supplier_id` 外鍵
- 資料遷移：從現有 `product_supplier_costs` 自動建立 `suppliers`
- RLS 政策與權限設定

#### 2. 類型定義
- `types/rbac.types.ts` - 新增 `suppliers` 資源
- `types/models.ts` - 新增 `Supplier` 介面

#### 3. 後端實作
- `lib/dal/suppliers.ts` - 供應商 CRUD 操作
- `lib/dal/product-supplier-costs.ts` - 改用 `supplier_id`
- API 路由：
  - `/api/suppliers` - 列表和新增
  - `/api/suppliers/[id]` - 單筆查詢、更新、刪除
  - `/api/suppliers/generate-number` - 自動生成編號

#### 4. 前端 Hooks
- `hooks/useSuppliers.ts` - 供應商 CRUD hooks
- `hooks/useProductSupplierCosts.ts` - 改用 `supplier_id`

#### 5. UI 頁面
- `app/[locale]/suppliers/page.tsx` - 供應商列表
- `app/[locale]/suppliers/new/page.tsx` - 新增供應商
- `app/[locale]/suppliers/[id]/page.tsx` - 編輯供應商
- `app/[locale]/suppliers/SupplierForm.tsx` - 表單組件
- `app/[locale]/suppliers/SupplierList.tsx` - 列表組件

#### 6. 產品供應商編輯器改善
- `components/products/SupplierCostEditor.tsx` - 從文字輸入改為下拉選單
- 新增「建立新供應商」快捷連結

#### 7. 導航更新
- `components/Sidebar.tsx` - 新增供應商選單（Products 下方）
- `components/MobileNav.tsx` - 新增供應商選單

#### 8. 翻譯
- `messages/zh.json` - 新增供應商相關中文翻譯
- `messages/en.json` - 新增供應商相關英文翻譯

### 供應商編號格式
- 格式：`SUP202512-0001`
- 每公司獨立編號序列

### 待執行
- ⚠️ 執行資料庫遷移 `migrations/042_supplier_independence.sql`
- 遷移完成前，供應商功能無法使用

### 向後相容
- 暫時保留 `supplier_name` 和 `supplier_code` 欄位
- 資料遷移後再決定是否移除

---

## 2025-12-13: Google OAuth 登入問題排查（瀏覽器 Cookie 問題）

### 問題
用戶 `acejou27@gmail.com` 反映無法登入：
- Google OAuth 完成後跳回登入頁
- 信箱密碼登入顯示「電子郵件或密碼錯誤」

### 排查過程
1. 檢查 auth.users → 帳號存在，`last_sign_in_at` 是當天
2. 檢查 user_profiles → 資料完整
3. 檢查 company_members → 有公司成員資格
4. 所有資料庫記錄正常

### 根本原因
**瀏覽器 Cookie 問題** - 用戶瀏覽器中有舊的/損壞的 session cookie，導致登入流程異常。

### 解決方案
用戶使用**無痕模式**登入後成功。建議清除 `quote24.cc` 的 Cookie。

### 結論
此問題是用戶端 Cookie 問題，系統本身沒有問題，**不需要修改代碼**。

### 經驗教訓
- 當登入問題出現時，先確認資料庫記錄（`last_sign_in_at` 可判斷是否實際登入成功）
- 用戶報告「登入失敗」可能是 Cookie/Session 問題而非系統問題
- 無痕模式是快速排除 Cookie 問題的好方法

---

## 2025-12-13: 修復 CSP 和翻譯缺失錯誤

### 問題
控制台出現兩類錯誤：
1. CSP 違規：Cloudflare Insights 腳本 (`static.cloudflareinsights.com`) 被阻止載入
2. 翻譯缺失：`MISSING_MESSAGE: status.signed (zh)`

### 根本原因
1. `lib/security/headers.ts` 的 CSP `script-src` 不包含 Cloudflare Insights 域名
2. `status.signed` 翻譯 key 在 `messages/zh.json` 和 `messages/en.json` 中未定義，但在 `QuotationDetail.tsx:112` 被使用

### 解決方案
1. 在 CSP `script-src` 加入 `https://static.cloudflareinsights.com`
2. 在翻譯檔案加入 `status.signed`：
   - 中文：「已簽署」
   - 英文：「Signed」

### 影響範圍
- `lib/security/headers.ts`
- `messages/zh.json`
- `messages/en.json`

---

## 2025-12-13: PDF 下載客戶名稱和項目遺失修復

### 問題
用戶報告下載 PDF 時：
1. 報價項目全部消失
2. 客戶名稱只顯示 "-"

**重要發現**：頁面上顯示正常，只有 PDF 有問題 → 數據層正確，問題在 PDF 生成邏輯

### 根本原因
`mapQuotationToPDFData()` 函數在處理數據時缺乏防禦性檢查：
- `items` 可能是 `undefined` 而非空陣列
- `customer_name` 結構可能不符預期（string vs object）

### 解決方案
在 `hooks/usePDFGenerator.ts` 的 `mapQuotationToPDFData` 函數中加入防禦性程式碼：

```typescript
// 確保 items 是陣列
const items = Array.isArray(quotation.items) ? quotation.items : []

// 確保 customer_name 結構正確
let customerName: { zh: string; en: string } | null = null
if (quotation.customer_name) {
  if (typeof quotation.customer_name === 'object' && 'zh' in quotation.customer_name) {
    customerName = quotation.customer_name as { zh: string; en: string }
  } else if (typeof quotation.customer_name === 'string') {
    customerName = { zh: quotation.customer_name, en: quotation.customer_name }
  }
}
```

### 修改的檔案
- `hooks/usePDFGenerator.ts` (第 97-108 行)

### 經驗教訓
1. **頁面正常 + PDF 異常** → 問題在數據轉換層，非 API 層
2. `QuotationWithCustomer` 類型定義為 `any`，導致 TypeScript 無法捕捉類型錯誤
3. 數據映射函數應始終包含防禦性檢查，不應假設輸入結構

### 後續建議
- 將 `types/extended.types.ts` 中的 `QuotationWithCustomer` 從 `any` 改為明確類型定義
- 在 `items` 屬性明確定義為 `QuotationItem[]`

---

## 2025-12-11: 報價單系統功能改善

### 背景
根據客戶反饋，實作以下四項功能改善：

### 新增功能

#### 1. 稅金可選擇性顯示
- 新增 `show_tax` 欄位到報價單
- 用戶可選擇是否在 PDF 文件上顯示稅金行
- 預設顯示稅金（向後相容）

#### 2. 整體優惠折抵（稅前折扣）
- 新增 `discount_amount` 和 `discount_description` 欄位
- 計算邏輯：品項小計 → 減折扣 → 折後小計 → 計稅 → 總計
- PDF 顯示折扣行和折後小計

#### 3. 自訂品項輸入
- 品項可手動輸入中英文名稱和價格
- 不需選擇既有產品（`product_id` 允許 NULL）
- UI 切換「選擇產品」和「自訂品項」模式

#### 4. 報價單附件照片
- 新增 `quotation_images` 資料表
- 支援多張照片上傳（JPG/PNG，每張最大 5MB）
- 使用 Supabase Storage 儲存

### 修改的檔案

**資料庫遷移**:
- `migrations/041_quotation_enhancements.sql` - Supabase PostgreSQL
- `migrations/d1/014_quotation_enhancements.sql` - Cloudflare D1

**類型與 DAL**:
- `types/models.ts` - 新增 `QuotationImage` 介面和更新 `Quotation`
- `lib/dal/quotation-images.ts` - 新增 CRUD 操作
- `lib/dal/quotations.ts` - 處理新欄位

**API 路由**:
- `app/api/quotations/route.ts` - 處理新欄位
- `app/api/quotations/[id]/route.ts` - 處理新欄位
- `app/api/quotations/[id]/images/route.ts` - 新增圖片 API

**前端**:
- `app/[locale]/quotations/QuotationForm.tsx` - 新增 UI 控制項

**PDF 生成**:
- `lib/pdf/pdf-layout.ts` - 條件渲染稅金和折扣
- `lib/pdf/pdf-translations.ts` - 新增翻譯 key

**翻譯**:
- `messages/zh.json` - 新增中文翻譯
- `messages/en.json` - 新增英文翻譯

### 向後相容性
- `show_tax` 預設 `true`（維持現有行為）
- `discount_amount` 預設 `0`（總額不變）
- 現有報價單不受影響

### 資料庫遷移執行（2025-12-11 22:30）
- ✅ 執行 `migrations/041_quotation_enhancements.sql`
- ✅ 新增 `quotations.show_tax`, `quotations.discount_amount`, `quotations.discount_description` 欄位
- ✅ 建立 `quotation_images` 資料表及 RLS policies
- ✅ 建立 `quotation-images` Storage bucket（5MB 限制，僅允許 JPG/PNG/WebP）
- ✅ 設定 Storage RLS policies（用戶只能存取自己公司的報價單圖片）
- ✅ 記錄到 `schema_migrations` 表

### 待辦
- QuotationImageUploader 獨立元件（目前使用內建 UI）

---

## 2025-12-11: Cloudflare Workers GitHub Actions 部署設定

### 問題
生產環境 Build 失敗：`Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 根本原因
1. **Workers 原生 Git 連動不支援 build-time 環境變數**
   - `NEXT_PUBLIC_*` 變數在 `next build` 時嵌入 JS
   - Workers 只提供 runtime 環境變數（`wrangler.jsonc` 的 `vars`）
   - Build 時讀不到這些變數，導致失敗

2. **Pages 與 OpenNext.js 不相容**
   - 嘗試遷移到 Pages（原生支援 build-time 變數）
   - Pages 部署成功但返回 404
   - 原因：OpenNext.js 產生 Workers 專用的 `worker.js`，Pages 無法執行

### 解決方案
**使用 GitHub Actions + Wrangler 取代原生 Git 連動**

1. 建立 `.github/workflows/deploy-cloudflare.yml`
2. 在 workflow `env:` 區塊設定 build-time 環境變數
3. 用 `wrangler deploy` 部署到 Workers
4. 加入 `--env preview` 支援預覽環境

### 部署架構
```
GitHub Repository
       │ push
       ▼
  GitHub Actions
       ├── main ──────→ quotation-system → https://quote24.cc
       └── feature/* ──→ quotation-system-preview → *.workers.dev
           fix/*
```

### 修改的檔案
- `.github/workflows/deploy-cloudflare.yml` - 新增 workflow
- `wrangler.jsonc` - 加入 `env.preview` 區塊

### GitHub 設定
**Secrets**:
- `CLOUDFLARE_API_TOKEN`

**Variables**:
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

### 必須手動執行
- ⚠️ **停用 Workers 原生 Git 連動**（Dashboard > Workers > Settings > Builds > Disconnect）
  - 否則每次 push 會觸發兩次部署（一次失敗、一次成功）

### 經驗總結
1. OpenNext.js 專案**只能用 Workers**，不能用 Pages
2. `NEXT_PUBLIC_*` 是 build-time 變數，必須在 build 時設定
3. `wrangler.jsonc` 的 `vars` 只是 runtime 變數，無法解決 build 問題
4. 預覽環境用 `env.preview` 繼承所有綁定（KV、R2、Analytics）
5. 建立了用戶級 skill：`~/.claude/skills/cloudflare-deploy.md` 供未來專案參考

---

## 2025-12-10: Supabase RLS 安全修復

### 問題
Supabase linter 報告 28 個安全錯誤：
- **6 個 Security Definer Views**：Views 使用 SECURITY DEFINER 屬性，繞過 RLS
- **22 個 RLS Disabled Tables**：Tables 沒有啟用 Row Level Security

### 修復方案
建立 7 個 migrations (034-040)：

1. **034_fix_security_definer_views.sql** - 重建所有 Views，加入 `auth.uid()` 過濾
2. **035_rls_helper_functions.sql** - 建立 RLS 輔助函數：
   - `is_super_admin()` - 檢查超級管理員
   - `can_access_company_rls()` - 檢查公司存取權
   - `is_company_owner()` - 檢查公司所有者
   - `get_user_company_ids()` - 取得用戶公司 ID 列表
3. **036_rls_system_tables.sql** - 系統表 RLS (roles, permissions, exchange_rates, schema_migrations)
4. **037_rls_user_tables.sql** - 用戶表 RLS (user_roles)
5. **038_rls_company_tables.sql** - 公司表 RLS (companies, company_members, company_settings)
6. **039_rls_business_tables.sql** - 業務表 RLS (11 表：customers, products, quotations 等)
7. **040_rls_sequence_tables.sql** - 序號表 RLS (quotation/product/customer_number_sequences)

### RLS 策略設計
- **System tables**: 所有人可讀，僅 super_admin 可改
- **User tables**: 用戶只能看自己的資料
- **Company tables**: 公司成員可查看，owner 可管理
- **Business tables**: 依 `company_id` 或 `user_id` 隔離
- **Special**: `quotation_shares` 允許 anon 存取已啟用的公開分享

### 執行結果
- ✅ 27 個表全部啟用 RLS
- ✅ 6 個 Views 移除 SECURITY DEFINER，改用 `auth.uid()` 過濾
- ✅ Service role 自動繞過 RLS（Cron jobs 不受影響）

### 修復過程中發現的 Bug
- `overdue_payments` view 使用 `ps.*` 會導致 `days_overdue` 欄位重複
- 解決方案：改為明確列出所有欄位

### 新增檔案
- `migrations/034_fix_security_definer_views.sql`
- `migrations/035_rls_helper_functions.sql`
- `migrations/036_rls_system_tables.sql`
- `migrations/037_rls_user_tables.sql`
- `migrations/038_rls_company_tables.sql`
- `migrations/039_rls_business_tables.sql`
- `migrations/040_rls_sequence_tables.sql`
- `migrations/034-040_combined_rls_fix.sql` - 合併檔案

---

## 2025-12-10: 資料庫欄位缺失問題修復 + 防呆機制建立

### 問題
客戶反應無法建立客戶，錯誤訊息：
```
Failed to create customer: Could not find the 'fax' column of 'customers' in the schema cache
```

### 根本原因
- Migration 026 (`026_add_fax_to_customers.sql`) 存在於檔案系統但從未在資料庫執行
- 沒有機制追蹤哪些 migrations 已執行

### 修復步驟
1. 執行缺失的 migration：
```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fax VARCHAR(50);
NOTIFY pgrst, 'reload schema';
```

### 防呆機制
為防止未來再發生類似問題，建立了以下機制：

#### 1. Migration 追蹤表
建立 `schema_migrations` 表追蹤所有已執行的 migrations：
```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checksum VARCHAR(64)
);
```

#### 2. 驗證腳本
新增 `scripts/verify-schema-sync.ts`：
- 自動比對 DAL 層定義的欄位與資料庫實際結構
- 檢查哪些 migrations 尚未執行
- 可整合到 CI/CD 流程中

### 新增檔案
- `migrations/000_create_migrations_table.sql` - 追蹤表定義
- `scripts/verify-schema-sync.ts` - Schema 驗證腳本

### CI/CD 整合

新增 GitHub Actions workflow `.github/workflows/schema-check.yml`：
- 當 `migrations/` 或 `lib/dal/` 有變更時自動執行
- 驗證 DAL 欄位與資料庫同步
- 檢查未執行的 migrations

本地執行驗證：
```bash
pnpm db:verify
```

### 經驗教訓
1. **Migration 檔案不等於已執行**：檔案存在不代表資料庫已更新
2. **需要追蹤機制**：每次執行 migration 都應記錄到追蹤表
3. **定期驗證**：CI/CD 中已加入 schema 驗證步驟

---

## 2025-12-09: 🚨 嚴重錯誤 - owner_id 外鍵設計錯誤導致生產環境無法新增報價單

### 問題嚴重性：🔴 Critical
**影響範圍**：所有用戶無法新增報價單，直接影響業務運營

### 錯誤時間線
1. Migration 028 設計時犯了致命錯誤
2. 部署到生產環境後，所有新增報價單操作失敗
3. 錯誤訊息具有誤導性，導致初步診斷方向錯誤

### 錯誤訊息
```
Failed to create quotation: insert or update on table "quotations" violates foreign key constraint "quotations_owner_id_fkey"
```

### 根本原因分析

#### 致命錯誤：外鍵指向錯誤的欄位

```
user_profiles 表結構：
┌─────────────────────────────────────────┐
│ id (主鍵)    │ 自動生成的 UUID           │ ← 錯誤指向這裡
│ user_id      │ 對應 auth.users.id        │ ← 應該指向這裡
└─────────────────────────────────────────┘

這兩個是完全不同的 UUID！
```

| 項目 | 錯誤設計 | 正確設計 |
|-----|---------|---------|
| 外鍵指向 | `user_profiles(id)` | `user_profiles(user_id)` |

#### 為什麼會出錯
1. 設計 migration 時**假設** `user_profiles.id` = `auth.users.id`
2. **沒有驗證** `user_profiles` 的實際表結構
3. **沒有測試** 新增報價單功能

#### 連鎖問題
1. 新用戶註冊後沒有自動創建 `user_profiles` 記錄
2. 即使有 `user_profiles`，外鍵指向錯誤也會失敗

### 修復步驟

#### 1. 為缺失用戶創建 user_profiles
```sql
INSERT INTO user_profiles (user_id, email, full_name)
SELECT au.id, au.email, COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
```

#### 2. 修正外鍵指向
```sql
-- 刪除錯誤的外鍵
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_owner_id_fkey;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_owner_id_fkey;

-- 創建正確的外鍵
ALTER TABLE quotations ADD CONSTRAINT quotations_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES user_profiles(user_id);

ALTER TABLE customers ADD CONSTRAINT customers_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES user_profiles(user_id);
```

#### 3. 刷新 Schema Cache
```sql
NOTIFY pgrst, 'reload schema';
```

### 預防措施（必須遵守）

#### 1. Migration 設計檢查清單
- [ ] **查看目標表的完整結構**：`\d table_name` 或查詢 `information_schema.columns`
- [ ] **確認外鍵指向的是正確欄位**：不要假設欄位名稱
- [ ] **檢查 user_profiles 的 id vs user_id**：這是常見陷阱
- [ ] **在開發環境測試完整流程**：不只是 migration 成功，要測試業務功能

#### 2. user_profiles 表的特殊性
```
⚠️ user_profiles 有兩個 UUID 欄位：
- id: 表主鍵（自動生成，與 auth.users.id 無關）
- user_id: 對應 auth.users.id（這才是要用的）

任何引用用戶的外鍵都應該指向 user_profiles(user_id)，不是 user_profiles(id)
```

#### 3. 部署前必須測試
- 新增報價單
- 新增客戶
- 新用戶註冊後的所有操作

### 經驗教訓

1. **永遠不要假設表結構**：一定要先查看實際結構
2. **外鍵設計要特別謹慎**：錯誤的外鍵會導致整個功能失效
3. **測試要覆蓋完整業務流程**：migration 成功不代表功能正常
4. **錯誤訊息可能誤導診斷**：要深入分析根本原因
5. **生產環境問題要快速響應**：這種錯誤直接影響業務

### 相關檔案
- `migrations/028_add_owner_fields.sql` - 已修正外鍵定義

---

## 2025-12-09: Supabase 客戶端環境變數完整修復

### 問題
生產環境 (quote24.cc) 出現錯誤：
```
@supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

### 根本原因（兩個層面）

#### 1. Server-side Runtime 問題
`wrangler.jsonc` 的 `compatibility_date` 設為 `2025-03-25`，早於 `2025-04-01`。
- `nodejs_compat_populate_process_env` 標誌在 `compatibility_date >= 2025-04-01` 時才自動啟用
- 修復：更新 `compatibility_date` 為 `2025-04-01`

#### 2. Client-side Build-time 問題
客戶端代碼的 `NEXT_PUBLIC_*` 是在 **build time** 被 Next.js 編譯器嵌入：
- `wrangler.jsonc` 的 `vars` 是 **runtime** 變數，不影響 build 過程
- Cloudflare Workers Builds 的 build 環境沒有設定這些變數
- 結果：`lib/supabase/client.ts` 編譯時 `process.env.NEXT_PUBLIC_*` 是 `undefined`

### 解決方案

#### Server-side（middleware.ts, server.ts）
```typescript
// 使用環境變數（需 compatibility_date >= 2025-04-01）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
```

#### Client-side（client.ts）
```typescript
// 硬編碼（因為 build-time 無法取得環境變數）
const SUPABASE_URL = 'https://oubsycwrxzkuviakzahi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...'
```

**安全性說明**：
- Anon Key 本來就是公開的（前端 JS 已暴露）
- 資料安全由 Supabase RLS 保護

### 修改的檔案
- `wrangler.jsonc`: `compatibility_date` → `2025-04-01`
- `middleware.ts`: 恢復使用 `process.env`
- `lib/supabase/client.ts`: 硬編碼 URL 和 Key

### 經驗教訓
1. Cloudflare Workers 環境變數有兩種類型：
   - **Runtime vars**（`wrangler.jsonc` vars）：Worker 執行時可用
   - **Build vars**（Dashboard 設定）：build 過程可用
2. `NEXT_PUBLIC_*` 對於 Next.js 客戶端代碼需要在 **build time** 可用
3. 對於客戶端代碼，最可靠的方案是硬編碼公開值

### 參考資料
- [Cloudflare process.env 支援公告](https://developers.cloudflare.com/changelog/2025-03-11-process-env-support/)
- [OpenNext Env Vars 文檔](https://opennext.js.org/cloudflare/howtos/env-vars)
- [Cloudflare Build Configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

---

## 2025-12-09: Cloudflare 部署無限循環修復

### 問題
部署在 Cloudflare 上執行超過 10 分鐘，build 過程陷入無限循環。

### 根本原因
`package.json` 的 build script 設定為：
```json
"build": "next build && pnpm exec opennextjs-cloudflare build"
```

當 `opennextjs-cloudflare build` 執行時，它內部會呼叫 `pnpm run build`，造成無限遞迴：
```
build → next build → opennextjs-cloudflare build → build → ...
```

### 解決方案
使用 `--skipNextBuild` 參數避免遞迴：
```json
"build": "next build && pnpm exec opennextjs-cloudflare build --skipNextBuild"
```

**流程**：
1. `next build` 執行
2. `opennextjs-cloudflare build --skipNextBuild` 執行（跳過內部的 next build 呼叫）
3. 生成 `.open-next` 目錄
4. 無遞迴 ✅

### 支援 Git 整合自動部署
這個修改支援 Cloudflare Workers Git 整合（push 到 GitHub 自動部署）：
- Cloudflare 組建命令：`pnpm run build`
- Cloudflare 部署命令：`npx wrangler deploy`

### 經驗教訓
1. `opennextjs-cloudflare build` 預設會呼叫 `pnpm run build`，會造成遞迴
2. 使用 `--skipNextBuild` 參數可以跳過 OpenNext 內部的 next build 呼叫
3. 參考 [OpenNext CLI 文檔](https://opennext.js.org/cloudflare/cli) 了解更多選項

---

## 2025-12-09: Google OAuth 登入重導向修復

### 問題
用戶反應 Google 登入驗證完成後會跳回登入畫面，無法正常進入系統。

### 根本原因（兩個問題）

#### 問題 1：Cloudflare 部署失敗
```
✘ [ERROR] The entry-point file at ".open-next/worker.js" was not found.
```

切換到 Cloudflare Git 整合後，build command 只執行 `next build`，
缺少 `opennextjs-cloudflare build` 步驟。

#### 問題 2：OAuth redirect URL 錯誤
`NEXT_PUBLIC_APP_URL` 環境變數在 build time 未設定，導致 OAuth redirect URL 指向 `localhost:3333`。

### 解決方案

#### 修復 1：修改 build script
```json
// package.json
"build": "next build && pnpm exec opennextjs-cloudflare build"
```

#### 修復 2：硬編碼 OAuth redirect URL
```typescript
// app/[locale]/login/LoginButton.tsx
const redirectBase = 'https://quote24.cc'
```

### 經驗教訓
1. Cloudflare Git 整合需要完整的 build 流程，包括 opennextjs-cloudflare build
2. wrangler.jsonc 的 `vars` 只對 runtime 有效，不影響 build time
3. 使用硬編碼生產 URL 可避免環境變數問題

### 相關提交
- `2343c33` - fix: 強制使用 quote24.cc 作為 OAuth redirect URL
- `8fa7d0b` - fix: 修改 build script 加入 opennextjs-cloudflare build

---

## 2025-12-08: 程式碼品質改善與部署架構調整

### 一、程式碼品質改善（PR #1）

#### 1.1 清理過時程式碼
- 刪除 `legacy_backup/` 資料夾（100+ 個過時檔案）

#### 1.2 CompanySettings.tsx 修復
- **Image 優化**：將 `unoptimized={true}` 改為 `unoptimized={!!pendingFiles.logo}`，僅對 blob URL 禁用優化
- **useCallback 依賴**：重新排序 `loadCompany` 定義，修正依賴陣列問題

#### 1.3 React Query staleTime 標準化
新增 `STALE_TIME` 常數到 `lib/api/queryClient.ts`：
| 類型 | 時間 | 用途 |
|------|------|------|
| STATIC | 10 分鐘 | 產品、客戶等少變動資料 |
| DYNAMIC | 5 分鐘 | 報價單、付款、合約等 |
| REALTIME | 2 分鐘 | 分析數據、即時統計 |

更新的 hooks：useProducts, useCustomers, useQuotations, usePayments, useContracts, useAnalytics

#### 1.4 統一錯誤處理
新增 `hooks/useApiError.ts`，提供：
- `handleError()` - 錯誤處理（含 toast 通知、console 記錄、認證重導向）
- `handleMutationError()` - React Query mutation 專用
- `getErrorMessage()` - 錯誤訊息提取

---

### 二、部署架構調整：切換至 Cloudflare Git 整合

#### 2.1 移除 GitHub Actions
- 刪除 `.github/workflows/cloudflare-deploy.yml`
- 部署改由 Cloudflare Dashboard Git 整合處理

#### 2.2 更新 wrangler.jsonc
- 加入 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 到 vars
- 加入 `NEXT_PUBLIC_APP_URL` 到 vars
- 自訂網域設定從 `zone_name` 改為 `custom_domain: true`

#### 2.3 設定 Cloudflare Secrets
透過 wrangler secret 設定：
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_POOLER_URL`

#### 2.4 自訂網域
- `quote24.cc` ✅
- `www.quote24.cc` ✅

---

### 三、注意事項

#### wrangler delete 陷阱
當 wrangler.jsonc 有多個環境（如 preview）時，`wrangler delete <worker-name>` 可能刪錯 worker。
**解決方案**：使用 `--name` 參數明確指定，如：
```bash
pnpm exec wrangler delete --name quotation-system-preview --force
```

#### NEXT_PUBLIC_* 環境變數
這些變數在 **build time** 嵌入 JavaScript，不是 runtime。
- 使用 Git 整合部署時，需在 wrangler.jsonc 的 `vars` 中設定
- 或在 Cloudflare Dashboard Build Settings 中設定

---

### 四、相關提交
- `0c4aafc` - 重構：程式碼品質改善
- `425c958` - 切換至 Cloudflare Git 整合部署
- `93e3244` - 修正：自訂網域設定改用 custom_domain
- `5c0c35c` - 移除 preview 環境設定

---

## 2024-12-04: 客戶和商品編號系統

### 問題
- 建立客戶/商品時報錯「編號已存在」
- `customer_number` 和 `product_number` 欄位在程式碼中被引用但資料庫不存在

### 解決方案
仿照報價單編號系統（migration 025）的模式實作：

1. **資料庫遷移** (`migrations/033_customer_product_number_system.sql`)
   - 新增 `customer_number` 和 `product_number` 欄位
   - 複合唯一約束 `(company_id, number)` - 每家公司獨立編號
   - 序列表追蹤每月編號
   - Advisory Lock 防止競爭條件
   - RPC 函數：`generate_customer_number_atomic()`, `generate_product_number_atomic()`

2. **DAL 層修改**
   - `lib/dal/customers.ts`: 新增 `generateCustomerNumber()`, `createCustomerWithRetry()`
   - `lib/dal/products.ts`: 新增 `generateProductNumber()`, `createProductWithRetry()`

3. **API 端點**
   - 新增 `/api/customers/generate-number`
   - 新增 `/api/products/generate-number`
   - 修改 POST `/api/customers` 和 `/api/products` 支援自訂編號

4. **前端表單**
   - `CustomerForm.tsx`: 新增客戶編號欄位，載入時自動生成
   - `ProductForm.tsx`: 新增商品編號欄位，載入時自動生成

5. **i18n 翻譯**
   - 新增 `customer.customerNumber` 和 `product.productNumber`

### 編號格式
- 客戶：`CUS202512-0001`
- 商品：`PRD202512-0001`

### 測試要點
- 新建客戶/商品時自動生成編號
- 使用者可自訂編號
- 不同公司可有相同編號
- 同公司不能有重複編號
