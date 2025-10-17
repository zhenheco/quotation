# Customer 模組遷移總結

## 遷移日期
2025-10-17

## 修改目標
將 Customer 相關頁面組件從使用 Supabase 客戶端改為使用 Zeabur PostgreSQL 數據庫服務。

## 修改文件清單

### 1. 伺服器端組件（Server Components）

#### `/app/[locale]/customers/page.tsx`
- **保留**: Supabase 認證邏輯 (`createClient()`, `auth.getUser()`)
- **修改**: 數據查詢從 `supabase.from('customers')` 改為 `getCustomers(user.id)`
- **新增**: 導入 `getCustomers` from `@/lib/services/database`
- **改進**: 使用 try-catch 錯誤處理

#### `/app/[locale]/customers/new/page.tsx`
- **無需修改**: 此頁面只負責渲染表單，不涉及數據查詢

#### `/app/[locale]/customers/[id]/page.tsx`
- **保留**: Supabase 認證邏輯
- **修改**: 數據查詢從 `supabase.from('customers').select()` 改為 `getCustomerById(id, user.id)`
- **新增**: 導入 `getCustomerById` from `@/lib/services/database`
- **改進**: 使用 try-catch 錯誤處理

### 2. 客戶端組件（Client Components）

#### `/app/[locale]/customers/CustomerList.tsx`
- **移除**: `import { createClient } from '@/lib/supabase/client'`
- **移除**: `const supabase = createClient()` 實例
- **修改**: 刪除功能從 `supabase.from('customers').delete()` 改為 `fetch('/api/customers/${id}', { method: 'DELETE' })`
- **改進**: 使用標準 fetch API，更好的錯誤處理

#### `/app/[locale]/customers/CustomerForm.tsx`
- **移除**: `import { createClient } from '@/lib/supabase/client'`
- **移除**: `const supabase = createClient()` 實例
- **移除**: `supabase.auth.getUser()` 呼叫（改由 API 處理）
- **修改**: 建立/更新功能從 Supabase 客戶端改為 fetch API
  - 建立: `POST /api/customers`
  - 更新: `PUT /api/customers/${id}`
- **改進**: 統一使用 REST API，錯誤處理更清晰

### 3. 新增 API 路由

#### `/app/api/customers/route.ts`
- **功能**: POST - 建立新客戶
- **認證**: 使用 Supabase Auth 驗證用戶身份
- **數據操作**: 使用 `createCustomer()` from `@/lib/services/database`
- **驗證**: 必填欄位檢查（name, email）

#### `/app/api/customers/[id]/route.ts`
- **功能**:
  - PUT - 更新現有客戶
  - DELETE - 刪除客戶
- **認證**: 使用 Supabase Auth 驗證用戶身份
- **數據操作**:
  - 使用 `updateCustomer(id, user.id, data)`
  - 使用 `deleteCustomer(id, user.id)`
- **安全性**: 所有操作都包含 user.id 驗證，確保多租戶隔離

## 架構設計

### 認證流程
```
用戶請求 → Supabase Auth → 取得 user.id → 傳遞給 database 服務
```

### 數據流向

#### 伺服器端渲染 (SSR)
```
Server Component → Supabase Auth → database 服務 → Zeabur PostgreSQL
```

#### 客戶端操作 (CSR)
```
Client Component → API Route → Supabase Auth → database 服務 → Zeabur PostgreSQL
```

## 關鍵設計原則

1. **認證與數據分離**
   - 認證統一使用 Supabase Auth
   - 數據存取統一使用 Zeabur PostgreSQL

2. **多租戶隔離**
   - 所有數據查詢都需要 user.id
   - API 路由在 database 服務層面強制執行權限檢查

3. **錯誤處理**
   - 伺服器端使用 try-catch
   - 客戶端使用 try-catch 和 response.ok 檢查
   - 所有錯誤都有清晰的訊息

4. **類型安全**
   - 使用 TypeScript interface 定義 Customer 類型
   - database 服務導出標準類型供其他模組使用

## 測試檢查清單

- [ ] 客戶列表頁面正常顯示
- [ ] 建立新客戶功能正常
- [ ] 編輯客戶功能正常
- [ ] 刪除客戶功能正常
- [ ] 搜尋客戶功能正常
- [ ] 多租戶隔離驗證（不同用戶看不到彼此的客戶）
- [ ] 錯誤處理正常（網路錯誤、驗證錯誤等）

## 後續工作

建議對 Products 和 Quotations 模組進行類似遷移：
1. Products 模組遷移
2. Quotations 模組遷移
3. 統一錯誤處理機制
4. 添加 API 速率限制（參考 quotations batch API）

## 技術債務

- 現有的 `/app/api/quotations` 路由仍在使用 Supabase 客戶端，需要後續遷移
- 建議統一 API 錯誤響應格式
- 建議添加 API 請求/響應日誌記錄
