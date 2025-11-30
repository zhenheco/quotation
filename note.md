# 開發筆記

## 2024-11-30: 修復新增公司時 role_id 為 null 錯誤

### 問題現象
用戶在新增公司存檔時跳出錯誤：
```
failed to add company member: null value in column "role_id" of relation "company_members" violates not-null constraint
```

### 根本原因
`app/api/companies/route.ts:111` 調用 `addCompanyMember` 時未提供 `role_id`：
```typescript
await addCompanyMember(db, company.id, user.id, undefined, true)
```

DAL 層 (`lib/dal/companies.ts:235`) 將 `undefined` 轉為 `null`：
```typescript
role_id: roleId || null,
```

但資料庫約束要求 `role_id NOT NULL`：
```sql
role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
```

### 解決方案
在 `addCompanyMember` 前先查詢 `company_owner` 角色的 ID：
```typescript
const { data: ownerRole, error: roleError } = await db
  .from('roles')
  .select('id')
  .eq('name', 'company_owner')
  .single()

if (roleError || !ownerRole) {
  await db.from('companies').delete().eq('id', company.id)
  return NextResponse.json(
    { error: 'Company owner role not found' },
    { status: 500 }
  )
}

await addCompanyMember(db, company.id, user.id, ownerRole.id, true)
```

### 經驗教訓
1. **DAL 層與資料庫約束不一致**：DAL 允許 `role_id` 為 null，但資料庫不允許
2. **參考現有實現**：`lib/services/company.ts:183-197` 已有正確做法
3. **錯誤處理需要回滾**：如果角色查詢失敗，應刪除剛建立的公司避免孤立資料

### 相關檔案
- `app/api/companies/route.ts` - API 路由（已修復）
- `lib/dal/companies.ts` - 資料存取層
- `lib/services/company.ts` - 服務層（正確實現參考）
- `migrations/003_multi_company_architecture.sql` - 資料庫約束定義

## 2024-11-30: 修復報價單編號跨公司重複問題

### 問題現象
新用戶建立第一張報價單時出現錯誤，因為報價單編號 `QT202411-0001` 已被其他公司使用。

### 根本原因
1. `quotations.quotation_number` 欄位有**全域 UNIQUE 約束**
2. `quotation_number_sequences` 只按 `user_id` 分組，未考慮 `company_id`
3. 編號生成函數 `generate_quotation_number_atomic(p_user_id)` 未考慮公司

### 解決方案
1. **移除全域 UNIQUE 約束**，改為複合唯一約束 `(company_id, quotation_number)`
2. **修改序列表**：新增 `company_id` 欄位，改為按 `(company_id, year_month)` 分組
3. **更新編號生成函數**：改為接收 `company_id` 參數
4. **更新 DAL 和 API 層**：傳遞 `company_id` 到編號生成函數
5. **更新前端**：從 localStorage 取得 `selectedCompanyId` 並傳遞給 API

### 相關檔案
- `migrations/025_quotation_number_per_company.sql` - 資料庫遷移
- `lib/dal/quotations.ts` - DAL 層修改
- `app/api/quotations/route.ts` - API 路由修改
- `app/[locale]/quotations/QuotationForm.tsx` - 前端表單修改
- `hooks/useQuotations.ts` - Hook 類型修改

### 執行 Migration
需要在 Supabase Dashboard 的 SQL Editor 執行 `migrations/025_quotation_number_per_company.sql`

## 2024-11-30: 修復報價單儲存按鈕無反應問題

### 問題現象
客戶反應在「建立報價單」頁面點擊「Save」按鈕後沒有任何反應，也沒有顯示錯誤訊息。

### 根本原因
1. **Toast 庫不匹配**：`providers.tsx` 使用 `react-hot-toast` 的 Toaster，但 23 個業務組件使用 `sonner` 的 toast
2. 這兩個庫完全獨立，sonner 的 toast 需要 sonner 的 Toaster 才能渲染
3. **翻譯鍵缺失**：`common.selectCompanyFirst` 不存在於翻譯檔案中

### 解決方案
1. **修改 `app/[locale]/providers.tsx`**：將 `react-hot-toast` 改為 `sonner` 的 Toaster
   ```typescript
   // Before
   import { Toaster } from 'react-hot-toast'

   // After
   import { Toaster } from 'sonner'
   ```
2. **新增翻譯鍵**：
   - `messages/zh.json`: `"selectCompanyFirst": "請先選擇公司"`
   - `messages/en.json`: `"selectCompanyFirst": "Please select a company first"`

### 經驗教訓
1. **檢查 Toast 庫一致性**：providers 和業務組件必須使用同一個 toast 庫
2. **翻譯鍵驗證**：新增 toast 訊息時要確保翻譯鍵存在

### 相關檔案
- `app/[locale]/providers.tsx` - Toast Provider（已修復）
- `messages/zh.json` - 中文翻譯（已新增）
- `messages/en.json` - 英文翻譯（已新增）
- `app/[locale]/quotations/QuotationForm.tsx` - 報價單表單（使用 sonner toast）
