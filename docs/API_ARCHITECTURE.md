# 報價單系統 API 架構分析

**文件版本**: v1.0.0
**建立日期**: 2025-10-24
**系統版本**: v0.1.0 (Alpha)

---

## 目錄

1. [架構概覽](#架構概覽)
2. [API 端點清單](#api-端點清單)
3. [認證與授權](#認證與授權)
4. [資料模型](#資料模型)
5. [請求/回應格式](#請求回應格式)
6. [錯誤處理](#錯誤處理)
7. [前端整合指南](#前端整合指南)
8. [安全性措施](#安全性措施)
9. [缺口分析](#缺口分析)

---

## 架構概覽

### 技術棧

- **前端**: Next.js 15.5.5 (App Router + Server Components)
- **後端**: Next.js API Routes (Server-Side)
- **資料庫**:
  - Zeabur PostgreSQL (主要資料庫)
  - Supabase (認證 + 部分資料)
- **認證**: Supabase Auth (Google OAuth)
- **語言**: TypeScript (100% 型別安全)

### 架構特點

1. **雙資料庫架構**:
   - Supabase: 處理認證和部分資料
   - Zeabur PostgreSQL: 主要業務資料

2. **Server Components 優先**:
   - 大部分頁面使用 Server Components 直接查詢資料
   - API Routes 主要用於：
     - 資料變更操作 (POST/PUT/DELETE)
     - 前端 Client Components 的資料請求
     - 外部整合 (匯率、PDF 生成)

3. **多租戶隔離**:
   - 所有查詢都包含 `user_id` 過濾
   - RLS (Row Level Security) 政策
   - 欄位白名單驗證

4. **RBAC 權限系統**:
   - 5 種角色：超級管理員、公司負責人、業務主管、業務人員、會計
   - 細粒度權限控制
   - 公司層級的資料隔離

---

## API 端點清單

### 1. 認證系統 (Authentication)

#### 1.1 OAuth 認證
```
POST /auth/callback
```
- **用途**: Google OAuth 回調處理
- **公開**: 是
- **實作位置**: `app/auth/callback/route.ts`

#### 1.2 用戶資訊
```
GET /api/me
GET /api/user-info
```
- **用途**: 取得當前使用者資訊
- **認證**: 必須
- **實作位置**: `app/api/me/route.ts`, `app/api/user-info/route.ts`

#### 1.3 RBAC 用戶管理
```
GET  /api/rbac/user-profile
POST /api/rbac/user-profile
```
- **用途**: 取得/更新使用者檔案和權限
- **認證**: 必須
- **實作位置**: `app/api/rbac/user-profile/route.ts`

---

### 2. 客戶管理 (Customers)

#### 2.1 客戶清單
```
GET /api/customers
```
**回應範例**:
```typescript
{
  id: string
  user_id: string
  name: { zh: string; en: string }
  email: string
  phone?: string
  address?: { zh: string; en: string }
  tax_id?: string
  contact_person?: { zh: string; en: string }
  created_at: string
  updated_at: string
}[]
```

#### 2.2 建立客戶
```
POST /api/customers
```
**請求主體**:
```typescript
{
  name: { zh: string; en: string }      // 必填
  email: string                          // 必填
  phone?: string
  address?: { zh: string; en: string }
  tax_id?: string
  contact_person?: { zh: string; en: string }
}
```

#### 2.3 更新客戶
```
PUT /api/customers/[id]
```
**安全特性**:
- 使用欄位白名單驗證
- 只允許更新指定欄位
- 自動過濾非法欄位

#### 2.4 刪除客戶
```
DELETE /api/customers/[id]
```
**注意事項**:
- 檢查是否有關聯報價單
- 可能觸發級聯刪除限制

---

### 3. 產品管理 (Products)

#### 3.1 產品清單
```
GET /api/products
```
**回應範例**:
```typescript
{
  id: string
  user_id: string
  sku?: string
  name: { zh: string; en: string }
  description?: { zh: string; en: string }
  unit_price: number
  currency: string
  category?: string
  cost_price?: number              // 僅會計和負責人可見
  cost_currency?: string
  profit_margin?: number
  supplier?: string
  created_at: string
  updated_at: string
}[]
```

#### 3.2 建立產品
```
POST /api/products
```
**請求主體**:
```typescript
{
  name: { zh: string; en: string }      // 必填
  description?: { zh: string; en: string }
  unit_price: number                     // 必填
  currency: string                       // 必填
  category?: string
  cost_price?: number                    // 需要權限
  cost_currency?: string
  supplier?: string
}
```

#### 3.3 更新產品
```
PUT /api/products/[id]
```

#### 3.4 刪除產品
```
DELETE /api/products/[id]
```

---

### 4. 報價單管理 (Quotations)

#### 4.1 報價單清單
```
GET /api/quotations
```
**回應範例**:
```typescript
{
  id: string
  user_id: string
  customer_id: string
  quotation_number: string          // 自動生成: Q2025-001
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes?: string
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'overdue'
  payment_due_date?: string
  total_paid?: number
  created_at: string
  updated_at: string
}[]
```

#### 4.2 建立報價單
```
POST /api/quotations
```
**請求主體**:
```typescript
{
  customer_id: string                   // 必填
  issue_date: string                    // 必填
  valid_until: string                   // 必填
  currency: string                      // 必填
  subtotal: number                      // 必填
  tax_rate: number
  tax_amount: number
  total_amount: number                  // 必填
  notes?: string
  items: Array<{                        // 必填，至少一項
    product_id?: string
    quantity: number
    unit_price: number
    discount: number
    subtotal: number
  }>
}
```

**商業邏輯**:
- 自動生成報價單號碼
- 驗證客戶所有權
- 批次插入報價單項目
- 預設狀態為 `draft`

#### 4.3 更新報價單
```
PUT /api/quotations/[id]
```
**特殊邏輯**:
- 更新項目時先刪除舊項目
- 重新插入新項目
- 支援部分欄位更新

#### 4.4 刪除報價單
```
DELETE /api/quotations/[id]
```
**級聯刪除**:
- 自動刪除所有報價單項目

#### 4.5 報價單 PDF 匯出
```
GET /api/quotations/[id]/pdf?locale=zh
```
**參數**:
- `locale`: `zh` | `en`

**回應**:
- Content-Type: `application/pdf`
- 檔案名稱: `{quotation_number}_{locale}.pdf`

#### 4.6 批次操作

##### 批次刪除
```
POST /api/quotations/batch/delete
```
**請求主體**:
```typescript
{
  ids: string[]                         // 最多 50 個
}
```

##### 批次匯出 PDF
```
POST /api/quotations/batch/export
```
**請求主體**:
```typescript
{
  ids: string[]                         // 最多 20 個
  locale: 'zh' | 'en'
}
```

**回應**:
- Content-Type: `application/zip`
- 包含所有報價單的 PDF 檔案

##### 批次狀態更新
```
POST /api/quotations/batch/status
```
**請求主體**:
```typescript
{
  ids: string[]
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
}
```

---

### 5. 匯率系統 (Exchange Rates)

#### 5.1 取得匯率
```
GET /api/exchange-rates?base=TWD
```
**回應範例**:
```typescript
{
  success: true
  base_currency: string
  rates: {
    USD: number
    EUR: number
    JPY: number
    CNY: number
    // ... 其他幣別
  }
  timestamp: string
}
```

#### 5.2 同步匯率
```
POST /api/exchange-rates/sync
```
**用途**: 手動觸發匯率同步

#### 5.3 定時同步 (Cron Job)
```
GET /api/cron/exchange-rates
```
**用途**: Vercel Cron Job 每日自動呼叫
**認證**: Cron Secret Token

---

### 6. 公司管理 (Companies)

#### 6.1 公司清單
```
GET /api/companies
```
**回應**: 使用者所屬的所有公司

#### 6.2 建立公司
```
POST /api/companies
```

#### 6.3 更新公司
```
PUT /api/companies/[id]
```

#### 6.4 刪除公司
```
DELETE /api/companies/[id]
```

#### 6.5 公司成員管理
```
GET    /api/companies/[id]/members
POST   /api/companies/[id]/members
DELETE /api/companies/[id]/members/[userId]
```

#### 6.6 公司設定
```
GET  /api/company-settings
POST /api/company-settings
```
**設定內容**:
- 公司資訊 (中英文名稱、統編)
- 聯絡資訊
- Logo、簽章、存摺影像
- 銀行資訊
- 預設設定 (幣別、稅率、付款條件)

---

### 7. 合約管理 (Contracts)

#### 7.1 從報價單建立合約
```
POST /api/contracts/from-quotation
```
**請求主體**:
```typescript
{
  quotation_id: string
  signed_date: string
  start_date: string
  end_date: string
  payment_terms: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
}
```

#### 7.2 逾期合約
```
GET /api/contracts/overdue
```

#### 7.3 收款進度
```
GET /api/contracts/[id]/payment-progress
```

#### 7.4 下次收款資訊
```
GET /api/contracts/[id]/next-collection
```

---

### 8. 收款管理 (Payments)

#### 8.1 收款清單
```
GET /api/payments?customer_id=xxx&status=unpaid
```
**查詢參數**:
- `customer_id`: 客戶篩選
- `quotation_id`: 報價單篩選
- `contract_id`: 合約篩選
- `status`: 狀態篩選
- `payment_type`: 付款類型篩選

#### 8.2 記錄收款
```
POST /api/payments
```
**請求主體**:
```typescript
{
  customer_id: string                   // 必填
  quotation_id?: string
  contract_id?: string
  payment_type: 'deposit' | 'installment' | 'final' | 'full' | 'recurring'
  payment_date: string                  // 必填
  amount: number                        // 必填
  currency: string                      // 必填
  payment_method?: 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other'
  reference_number?: string
  notes?: string
}
```

**自動邏輯**:
- 更新報價單/合約的付款狀態
- 計算 `total_paid`
- 自動計算下次收款日期
- 標記逾期狀態

#### 8.3 未收款清單
```
GET /api/payments/unpaid
```
**回應**: 超過 30 天未收款的記錄

#### 8.4 已收款清單
```
GET /api/payments/collected
```

#### 8.5 收款提醒
```
GET /api/payments/reminders
```
**回應**: 未來 30 天內到期的收款

#### 8.6 標記逾期
```
POST /api/payments/[id]/mark-overdue
```

---

### 9. 管理員系統 (Admin)

#### 9.1 管理員儀表板
```
GET /api/admin/stats
```
**權限**: 超級管理員

#### 9.2 公司管理
```
GET    /api/admin/companies
PUT    /api/admin/companies/[id]
GET    /api/admin/companies/[id]/members
POST   /api/admin/companies/[id]/members
```

#### 9.3 使用者管理
```
GET  /api/admin/users
POST /api/admin/users/[id]/role
```

#### 9.4 使用者權限
```
GET /api/user/permissions
GET /api/user/companies
GET /api/company/manageable
```

---

### 10. 開發/測試端點

#### 10.1 測試資料生成
```
POST /api/seed-test-data
```
**用途**: 生成測試用客戶、產品、報價單

#### 10.2 測試 Email
```
POST /api/test-email
```

#### 10.3 測試管理員權限
```
GET /api/test-admin
```

---

## 認證與授權

### 認證機制

#### 1. Supabase Auth
```typescript
// 取得當前使用者
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

#### 2. Middleware 包裝
```typescript
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async (request, { userId }) => {
  // userId 已驗證
  const data = await getData(userId)
  return NextResponse.json(data)
})
```

#### 3. 權限檢查
```typescript
import { withPermission } from '@/lib/middleware/withAuth'

export const DELETE = withPermission('quotations', 'delete',
  async (request, { userId }) => {
    // 已驗證 quotations:delete 權限
    await deleteQuotation(id, userId)
    return NextResponse.json({ success: true })
  }
)
```

### RBAC 角色權限

#### 角色層級 (Level)
```typescript
const ROLE_LEVELS = {
  super_admin: 1,      // 最高權限
  company_owner: 2,    // 公司負責人
  sales_manager: 3,    // 業務主管
  salesperson: 4,      // 業務人員
  accountant: 5,       // 會計
}
```

#### 權限矩陣

| 資源 | 超級管理員 | 公司負責人 | 業務主管 | 業務人員 | 會計 |
|------|-----------|-----------|---------|---------|------|
| products:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| products:write | ✅ | ✅ | ✅ | ❌ | ❌ |
| products:read_cost | ✅ | ✅ | ❌ | ❌ | ✅ |
| customers:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| customers:write | ✅ | ✅ | ✅ | ✅ | ❌ |
| quotations:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| quotations:write | ✅ | ✅ | ✅ | ✅ | ❌ |
| quotations:delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| contracts:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| contracts:write | ✅ | ✅ | ✅ | ❌ | ❌ |
| payments:read | ✅ | ✅ | ✅ | ❌ | ✅ |
| payments:write | ✅ | ✅ | ❌ | ❌ | ✅ |
| company_settings:write | ✅ | ✅ | ❌ | ❌ | ❌ |
| users:read | ✅ | ✅ | ❌ | ❌ | ❌ |
| users:assign_roles | ✅ | ✅* | ❌ | ❌ | ❌ |

*公司負責人只能分配 level ≥ 3 的角色

### 多租戶隔離

#### 1. 資料庫層級
```sql
-- 所有查詢都包含 user_id 過濾
SELECT * FROM quotations WHERE user_id = $1
```

#### 2. Row Level Security (RLS)
```sql
-- Supabase RLS 政策範例
CREATE POLICY "Users can view their own quotations"
  ON quotations FOR SELECT
  USING (auth.uid() = user_id);
```

#### 3. 服務層驗證
```typescript
export async function getQuotationById(id: string, userId: string) {
  const result = await query(
    'SELECT * FROM quotations WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return result.rows[0] || null
}
```

### CSRF 保護

- Next.js 內建 CSRF Token
- 所有變更操作 (POST/PUT/DELETE) 需要有效 Token
- Middleware 自動驗證

---

## 資料模型

### 核心資料表

#### 1. customers (客戶)
```typescript
interface Customer {
  id: string                            // UUID
  user_id: string                       // 擁有者 ID
  name: {                               // 中英文名稱
    zh: string
    en: string
  }
  email: string                         // 必填
  phone?: string
  address?: {                           // 中英文地址
    zh: string
    en: string
  }
  tax_id?: string                       // 統編
  contact_person?: {                    // 聯絡人
    zh: string
    en: string
  }
  created_at: string
  updated_at: string
}
```

#### 2. products (產品)
```typescript
interface Product {
  id: string
  user_id: string
  sku?: string                          // 產品編號
  name: {
    zh: string
    en: string
  }
  description?: {
    zh: string
    en: string
  }
  unit_price: number                    // 售價
  currency: string                      // 幣別
  category?: string                     // 分類
  cost_price?: number                   // 成本價 (敏感欄位)
  cost_currency?: string
  profit_margin?: number                // 利潤率
  supplier?: string                     // 供應商
  supplier_code?: string
  created_at: string
  updated_at: string
}
```

#### 3. quotations (報價單)
```typescript
interface Quotation {
  id: string
  user_id: string
  customer_id: string
  quotation_number: string              // 自動生成: Q2025-001
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  issue_date: string                    // 發行日期
  valid_until: string                   // 有效期限
  currency: string
  subtotal: number                      // 小計
  tax_rate: number                      // 稅率
  tax_amount: number                    // 稅額
  total_amount: number                  // 總計
  notes?: string                        // 備註

  // 付款追蹤欄位
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'overdue'
  payment_due_date?: string
  total_paid?: number
  deposit_amount?: number
  deposit_paid_date?: string
  final_payment_amount?: number
  final_payment_due_date?: string

  // 合約欄位 (報價單接受後轉為合約)
  contract_signed_date?: string
  contract_expiry_date?: string
  payment_frequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  next_collection_date?: string
  next_collection_amount?: number

  created_at: string
  updated_at: string
}
```

#### 4. quotation_items (報價單項目)
```typescript
interface QuotationItem {
  id: string
  quotation_id: string
  product_id?: string                   // 可選，可手動輸入
  description: {                        // 項目描述
    zh: string
    en: string
  }
  quantity: number                      // 數量
  unit_price: number                    // 單價
  discount: number                      // 折扣 %
  amount: number                        // 小計
  sort_order: number                    // 排序
  created_at: string
  updated_at: string
}
```

#### 5. exchange_rates (匯率)
```typescript
interface ExchangeRate {
  id: string
  from_currency: string                 // 基準幣別
  to_currency: string                   // 目標幣別
  rate: number                          // 匯率
  date: string                          // 日期
  source: string                        // 來源 (ExchangeRate-API)
  created_at: string
}
```

### RBAC 資料表

#### 6. roles (角色)
```typescript
interface Role {
  id: string
  name: RoleName
  name_zh: string
  name_en: string
  level: number                         // 1-5, 數字越小權限越大
  description?: string
  created_at: string
  updated_at: string
}
```

#### 7. permissions (權限)
```typescript
interface Permission {
  id: string
  resource: string                      // products, customers, etc.
  action: string                        // read, write, delete, etc.
  name: string                          // "products:read"
  description?: string
  created_at: string
}
```

#### 8. user_roles (使用者角色)
```typescript
interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by?: string                  // 誰分配的
  created_at: string
  updated_at: string
}
```

#### 9. role_permissions (角色權限)
```typescript
interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}
```

#### 10. user_profiles (使用者檔案)
```typescript
interface UserProfile {
  id: string
  user_id: string
  full_name?: string
  display_name?: string
  phone?: string
  department?: string
  avatar_url?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}
```

### 公司與合約資料表

#### 11. companies (公司)
```typescript
interface Company {
  id: string
  name: {
    zh: string
    en: string
  }
  logo_url?: string
  created_at: string
  updated_at: string
}
```

#### 12. company_members (公司成員)
```typescript
interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: RoleName
  is_active: boolean
  joined_at: string
  created_at: string
  updated_at: string
}
```

#### 13. contracts (合約)
```typescript
interface Contract {
  id: string
  user_id: string
  customer_id: string
  quotation_id?: string                 // 來自哪個報價單
  contract_number: string               // 合約編號
  title: string
  start_date: string
  end_date: string
  signed_date?: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  total_amount: number
  currency: string
  payment_terms?: PaymentFrequency
  next_collection_date?: string
  next_collection_amount?: number
  contract_file_url?: string
  notes?: string
  terms_and_conditions?: string
  created_at: string
  updated_at: string
}
```

#### 14. payments (收款記錄)
```typescript
interface Payment {
  id: string
  user_id: string
  quotation_id?: string
  contract_id?: string
  customer_id: string
  payment_type: 'deposit' | 'installment' | 'final' | 'full' | 'recurring'
  payment_date: string
  amount: number
  currency: string
  payment_frequency?: PaymentFrequency
  is_overdue: boolean
  days_overdue: number
  payment_method?: PaymentMethod
  reference_number?: string
  receipt_url?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string
}
```

#### 15. payment_schedules (付款排程)
```typescript
interface PaymentSchedule {
  id: string
  user_id: string
  contract_id: string
  customer_id: string
  schedule_number: number               // 第幾期
  due_date: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paid_amount: number
  paid_date?: string
  days_overdue: number
  last_reminder_sent_at?: string
  reminder_count: number
  payment_id?: string                   // 關聯的收款記錄
  notes?: string
  created_at: string
  updated_at: string
}
```

#### 16. company_settings (公司設定)
```typescript
interface CompanySettings {
  id: string
  user_id: string
  company_name_zh?: string
  company_name_en?: string
  tax_id?: string
  address_zh?: string
  address_en?: string
  phone?: string
  email?: string
  website?: string
  logo_url?: string
  signature_url?: string
  passbook_image_url?: string
  bank_name?: string
  bank_code?: string
  account_number?: string
  account_name?: string
  swift_code?: string
  default_currency: string
  default_tax_rate: number
  default_payment_terms?: PaymentFrequency
  default_payment_day: number           // 每月幾號收款
  created_at: string
  updated_at: string
}
```

### 資料關聯圖

```
users (Supabase Auth)
  ├─> user_profiles
  ├─> user_roles ─> roles ─> role_permissions ─> permissions
  ├─> company_members ─> companies
  ├─> customers
  ├─> products
  ├─> quotations
  │     ├─> quotation_items
  │     └─> payments
  ├─> contracts
  │     ├─> payment_schedules
  │     └─> payments
  └─> company_settings
```

---

## 請求/回應格式

### 統一回應格式

#### 成功回應
```typescript
// 單一資源
{
  success: true,
  data: { /* 資源物件 */ }
}

// 資源清單
{
  success: true,
  data: [ /* 資源陣列 */ ],
  count: 10,
  pagination?: {
    page: 1,
    per_page: 20,
    total: 100,
    total_pages: 5
  }
}

// 操作成功
{
  success: true,
  message: "操作成功"
}
```

#### 錯誤回應
```typescript
// 一般錯誤
{
  error: "錯誤訊息",
  message?: "詳細說明"
}

// 驗證錯誤
{
  error: "Validation failed",
  errors: {
    field1: ["錯誤訊息1", "錯誤訊息2"],
    field2: ["錯誤訊息"]
  }
}

// 權限錯誤
{
  error: "Insufficient permissions: resource:action"
}
```

### HTTP 狀態碼

| 狀態碼 | 意義 | 使用情境 |
|--------|------|---------|
| 200 | OK | 成功取得資源 |
| 201 | Created | 成功建立資源 |
| 204 | No Content | 成功刪除資源 |
| 400 | Bad Request | 請求參數錯誤、驗證失敗 |
| 401 | Unauthorized | 未認證 |
| 403 | Forbidden | 無權限 |
| 404 | Not Found | 資源不存在 |
| 409 | Conflict | 資源衝突 (如重複建立) |
| 429 | Too Many Requests | 超過速率限制 |
| 500 | Internal Server Error | 伺服器錯誤 |

### 分頁參數

```typescript
// 查詢參數
?page=1&per_page=20&sort=created_at&order=desc

// 回應
{
  data: [ /* ... */ ],
  pagination: {
    page: 1,
    per_page: 20,
    total: 100,
    total_pages: 5,
    has_next: true,
    has_prev: false
  }
}
```

### 篩選參數

```typescript
// 日期範圍
?start_date=2025-01-01&end_date=2025-12-31

// 狀態篩選
?status=draft,sent

// 搜尋
?search=關鍵字

// 排序
?sort=created_at&order=desc
```

---

## 錯誤處理

### 錯誤類型

#### 1. 認證錯誤 (401)
```typescript
{
  error: "Unauthorized",
  message: "請先登入"
}
```

**前端處理**:
```typescript
if (response.status === 401) {
  // 導向登入頁
  router.push('/login')
}
```

#### 2. 權限錯誤 (403)
```typescript
{
  error: "Insufficient permissions: quotations:delete",
  message: "您沒有權限刪除報價單"
}
```

**前端處理**:
```typescript
if (response.status === 403) {
  // 顯示權限不足訊息
  toast.error('您沒有權限執行此操作')
}
```

#### 3. 驗證錯誤 (400)
```typescript
{
  error: "Validation failed",
  errors: {
    email: ["Email 格式不正確"],
    phone: ["電話號碼必須為 10 碼"]
  }
}
```

**前端處理**:
```typescript
if (response.status === 400) {
  const { errors } = await response.json()
  // 顯示欄位錯誤
  Object.entries(errors).forEach(([field, messages]) => {
    setFieldError(field, messages[0])
  })
}
```

#### 4. 資源不存在 (404)
```typescript
{
  error: "Customer not found or unauthorized"
}
```

#### 5. 伺服器錯誤 (500)
```typescript
{
  error: "Internal server error",
  message: "系統錯誤，請稍後再試"
}
```

**前端處理**:
```typescript
if (response.status >= 500) {
  // 顯示通用錯誤訊息
  toast.error('系統發生錯誤，請稍後再試')

  // 可選：發送錯誤報告
  reportError(error)
}
```

### 錯誤處理最佳實踐

#### 統一錯誤處理函數
```typescript
// lib/api/error-handler.ts
export async function handleApiError(response: Response) {
  const contentType = response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    const error = await response.json()

    switch (response.status) {
      case 401:
        // 導向登入
        window.location.href = '/login'
        break
      case 403:
        toast.error('權限不足')
        break
      case 404:
        toast.error('資源不存在')
        break
      case 500:
        toast.error('系統錯誤，請稍後再試')
        break
      default:
        toast.error(error.error || '發生錯誤')
    }

    throw new Error(error.error)
  }

  throw new Error('發生未知錯誤')
}

// 使用範例
try {
  const response = await fetch('/api/quotations', {
    method: 'POST',
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    await handleApiError(response)
  }

  return await response.json()
} catch (error) {
  console.error('API Error:', error)
  throw error
}
```

---

## 前端整合指南

### 1. API 客戶端設定

#### 基礎配置
```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    await handleApiError(response)
  }

  return await response.json()
}
```

### 2. 型別定義 (TypeScript)

#### 建議結構
```typescript
// types/api.types.ts
import type {
  Customer,
  Product,
  Quotation,
  QuotationItem
} from '@/types/database.types'

// API 回應型別
export interface ApiResponse<T> {
  success: boolean
  data: T
  count?: number
  pagination?: Pagination
}

export interface ApiError {
  error: string
  message?: string
  errors?: Record<string, string[]>
}

// 請求型別
export interface CreateCustomerRequest {
  name: { zh: string; en: string }
  email: string
  phone?: string
  address?: { zh: string; en: string }
  tax_id?: string
  contact_person?: { zh: string; en: string }
}

export interface CreateQuotationRequest {
  customer_id: string
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes?: string
  items: QuotationItem[]
}
```

### 3. API 服務層

#### 客戶服務
```typescript
// lib/api/customers.ts
import { apiClient } from './client'
import type { Customer, CreateCustomerRequest } from '@/types/api.types'

export async function getCustomers(): Promise<Customer[]> {
  const response = await apiClient<ApiResponse<Customer[]>>('/customers')
  return response.data
}

export async function getCustomerById(id: string): Promise<Customer> {
  const response = await apiClient<ApiResponse<Customer>>(`/customers/${id}`)
  return response.data
}

export async function createCustomer(data: CreateCustomerRequest): Promise<Customer> {
  const response = await apiClient<ApiResponse<Customer>>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function updateCustomer(
  id: string,
  data: Partial<CreateCustomerRequest>
): Promise<Customer> {
  const response = await apiClient<ApiResponse<Customer>>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient(`/customers/${id}`, {
    method: 'DELETE',
  })
}
```

#### 報價單服務
```typescript
// lib/api/quotations.ts
export async function getQuotations(filters?: {
  status?: string
  customer_id?: string
  start_date?: string
  end_date?: string
}): Promise<Quotation[]> {
  const params = new URLSearchParams(filters as any)
  const response = await apiClient<ApiResponse<Quotation[]>>(
    `/quotations?${params}`
  )
  return response.data
}

export async function createQuotation(
  data: CreateQuotationRequest
): Promise<Quotation> {
  const response = await apiClient<ApiResponse<Quotation>>('/quotations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function exportQuotationPDF(
  id: string,
  locale: 'zh' | 'en'
): Promise<Blob> {
  const response = await fetch(`/api/quotations/${id}/pdf?locale=${locale}`)
  return await response.blob()
}

export async function batchExportPDFs(
  ids: string[],
  locale: 'zh' | 'en'
): Promise<Blob> {
  const response = await fetch('/api/quotations/batch/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, locale }),
  })
  return await response.blob()
}
```

### 4. React Hooks

#### useCustomers Hook
```typescript
// hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as customersApi from '@/lib/api/customers'
import type { Customer, CreateCustomerRequest } from '@/types/api.types'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.getCustomers,
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.getCustomerById(id),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<CreateCustomerRequest>) =>
      customersApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', id] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: customersApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
```

#### useQuotations Hook
```typescript
// hooks/useQuotations.ts
export function useQuotations(filters?: QuotationFilters) {
  return useQuery({
    queryKey: ['quotations', filters],
    queryFn: () => quotationsApi.getQuotations(filters),
  })
}

export function useCreateQuotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: quotationsApi.createQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('報價單建立成功')
    },
    onError: (error) => {
      toast.error('報價單建立失敗')
    },
  })
}

export function useExportQuotationPDF(id: string) {
  return useMutation({
    mutationFn: (locale: 'zh' | 'en') =>
      quotationsApi.exportQuotationPDF(id, locale),
    onSuccess: (blob) => {
      // 下載 PDF
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}
```

### 5. 表單處理

#### React Hook Form + Zod 驗證
```typescript
// components/CustomerForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const customerSchema = z.object({
  name: z.object({
    zh: z.string().min(1, '請輸入中文名稱'),
    en: z.string().min(1, '請輸入英文名稱'),
  }),
  email: z.string().email('Email 格式不正確'),
  phone: z.string().optional(),
  address: z.object({
    zh: z.string().optional(),
    en: z.string().optional(),
  }).optional(),
  tax_id: z.string().optional(),
  contact_person: z.object({
    zh: z.string().optional(),
    en: z.string().optional(),
  }).optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

export function CustomerForm() {
  const createCustomer = useCreateCustomer()

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: { zh: '', en: '' },
      email: '',
    },
  })

  const onSubmit = async (data: CustomerFormData) => {
    try {
      await createCustomer.mutateAsync(data)
      router.push('/customers')
    } catch (error) {
      // 錯誤已由 mutation 處理
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* 表單欄位 */}
    </form>
  )
}
```

### 6. 樂觀更新

```typescript
export function useDeleteQuotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: quotationsApi.deleteQuotation,
    // 樂觀更新：立即從 UI 移除
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['quotations'] })

      const previousQuotations = queryClient.getQueryData(['quotations'])

      queryClient.setQueryData(['quotations'], (old: Quotation[]) =>
        old.filter((q) => q.id !== id)
      )

      return { previousQuotations }
    },
    // 如果失敗，還原
    onError: (err, id, context) => {
      queryClient.setQueryData(['quotations'], context?.previousQuotations)
      toast.error('刪除失敗')
    },
    // 完成後重新取得
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })
}
```

### 7. 快取策略

```typescript
// lib/api/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 分鐘後資料視為過期
      staleTime: 5 * 60 * 1000,
      // 保留快取 10 分鐘
      cacheTime: 10 * 60 * 1000,
      // 重新聚焦時不自動重新取得
      refetchOnWindowFocus: false,
      // 重試 3 次
      retry: 3,
      // 重試延遲
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})
```

### 8. 錯誤邊界

```typescript
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error) => ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    // 可選：發送錯誤報告
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!)
      }

      return (
        <div className="error-container">
          <h2>發生錯誤</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            重新載入
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// 使用
<ErrorBoundary>
  <QuotationList />
</ErrorBoundary>
```

---

## 安全性措施

### 1. SQL Injection 防護

#### 欄位白名單驗證
```typescript
// lib/security/field-validator.ts
export const CUSTOMER_ALLOWED_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'tax_id',
  'contact_person'
] as const

export function buildUpdateFields(
  data: Record<string, any>,
  allowedFields: readonly string[]
) {
  const fields: string[] = []
  const values: any[] = []
  let paramCount = 1

  Object.entries(data).forEach(([key, value]) => {
    // 只允許白名單欄位
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  })

  return { fields, values, paramCount }
}
```

#### 參數化查詢
```typescript
// 永遠使用參數化查詢，不要字串拼接
// ❌ 危險
const query = `SELECT * FROM users WHERE email = '${email}'`

// ✅ 安全
const query = 'SELECT * FROM users WHERE email = $1'
const result = await db.query(query, [email])
```

### 2. XSS 防護

#### 輸入淨化
```typescript
// lib/security/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  })
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
}
```

#### React 自動轉義
```tsx
// React 預設會自動轉義，避免使用 dangerouslySetInnerHTML
// ✅ 安全
<div>{userInput}</div>

// ⚠️ 謹慎使用
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userInput) }} />
```

### 3. CSRF 防護

Next.js 內建 CSRF Token 驗證，但建議：

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 設定安全標頭
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}
```

### 4. 速率限制

```typescript
// lib/middleware/rate-limiter.ts
import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from 'limiter'

const limiters = new Map<string, RateLimiter>()

export async function rateLimiter(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000 // 1 分鐘
) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  if (!limiters.has(ip)) {
    limiters.set(ip, new RateLimiter({
      tokensPerInterval: maxRequests,
      interval: windowMs
    }))
  }

  const limiter = limiters.get(ip)!
  const hasToken = await limiter.removeTokens(1)

  if (!hasToken) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  return null
}

// 使用
export async function POST(request: NextRequest) {
  const rateLimitError = await rateLimiter(request)
  if (rateLimitError) return rateLimitError

  // ... 處理請求
}
```

### 5. 敏感資料保護

#### 成本價保護
```typescript
// 只有特定角色可以看到成本價
export async function getProducts(userId: string) {
  const canSeeCost = await canAccessProductCost(userId)

  const products = await query(
    'SELECT * FROM products WHERE user_id = $1',
    [userId]
  )

  // 如果沒有權限，移除成本欄位
  if (!canSeeCost) {
    return products.rows.map(p => ({
      ...p,
      cost_price: undefined,
      cost_currency: undefined,
      profit_margin: undefined,
    }))
  }

  return products.rows
}
```

### 6. 檔案上傳安全

```typescript
// lib/upload/security.ts
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return '不支援的檔案格式'
  }

  if (file.size > MAX_FILE_SIZE) {
    return '檔案大小不能超過 5MB'
  }

  return null
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase()
}
```

### 7. 環境變數保護

```typescript
// .env.local (不要提交到 Git)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # 只在 server 使用

# 前端可存取 (NEXT_PUBLIC_ 前綴)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

```typescript
// 檢查必要環境變數
// lib/config.ts
function getEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

export const config = {
  database: {
    url: getEnvVar('DATABASE_URL'),
  },
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  },
}
```

---

## 缺口分析

### 1. 缺少的端點

#### 1.1 高優先級

**分頁支援**
```
GET /api/customers?page=1&per_page=20
GET /api/products?page=1&per_page=20
GET /api/quotations?page=1&per_page=20
```
- **現況**: 目前回傳所有資料，沒有分頁
- **影響**: 資料量大時效能問題
- **建議**: 實作 offset/limit 分頁

**搜尋功能**
```
GET /api/customers?search=公司名稱
GET /api/products?search=產品名稱
```
- **現況**: 前端搜尋，效能差
- **建議**: 實作全文搜尋或 LIKE 查詢

**排序功能**
```
GET /api/quotations?sort=created_at&order=desc
```
- **現況**: 固定排序
- **建議**: 支援多欄位動態排序

#### 1.2 中優先級

**客戶統計**
```
GET /api/customers/[id]/stats
```
回應:
```typescript
{
  total_quotations: number
  total_contracts: number
  total_revenue: number
  payment_status: 'good' | 'warning' | 'overdue'
}
```

**產品使用統計**
```
GET /api/products/[id]/usage
```
回應:
```typescript
{
  quotation_count: number
  total_quantity: number
  total_revenue: number
  popular_customers: Customer[]
}
```

**報價單複製**
```
POST /api/quotations/[id]/duplicate
```
- **用途**: 快速建立相似報價單
- **邏輯**: 複製報價單和項目，生成新號碼

**報價單版本控制**
```
GET /api/quotations/[id]/versions
POST /api/quotations/[id]/versions
```
- **用途**: 追蹤報價單修改歷史
- **建議**: 每次更新前儲存版本快照

#### 1.3 低優先級

**批次匯入**
```
POST /api/customers/import
POST /api/products/import
```
- **用途**: Excel/CSV 批次匯入
- **格式**: multipart/form-data

**資料匯出**
```
GET /api/customers/export?format=csv
GET /api/quotations/export?format=excel
```

**報表端點**
```
GET /api/reports/revenue?start_date&end_date
GET /api/reports/quotations-by-status
GET /api/reports/customers-by-region
```

### 2. API 設計問題

#### 2.1 不一致的命名

**問題**: 部分端點使用 snake_case，部分使用 camelCase

```typescript
// ❌ 不一致
POST /api/quotations         // 參數: customer_id
POST /api/exchange-rates     // 參數: base_currency
POST /api/company-settings   // 參數: companyName
```

**建議**: 統一使用 snake_case 或 camelCase

#### 2.2 回應格式不統一

**問題**: 有些端點直接回傳陣列，有些包裝在 `data` 欄位

```typescript
// 不一致
GET /api/customers → Customer[]
GET /api/payments  → { success: true, data: Payment[] }
```

**建議**: 統一格式
```typescript
{
  success: true,
  data: T,
  meta?: {
    pagination: {...},
    filters: {...}
  }
}
```

#### 2.3 缺少 PATCH 方法

**問題**: 只有 PUT，沒有 PATCH

```typescript
// 現況：必須傳送完整物件
PUT /api/customers/[id]

// 建議：支援部分更新
PATCH /api/customers/[id]
{
  phone: "新電話"  // 只更新電話
}
```

### 3. 錯誤處理改進

#### 3.1 錯誤碼標準化

**建議**: 使用 RFC 7807 Problem Details

```typescript
{
  type: "https://api.example.com/errors/validation-failed",
  title: "Validation Failed",
  status: 400,
  detail: "Email field is required",
  instance: "/api/customers",
  errors: {
    email: ["Email is required"]
  }
}
```

#### 3.2 國際化錯誤訊息

```typescript
// 現況：硬編碼中文
{ error: "客戶不存在" }

// 建議：錯誤碼 + 多語言
{
  code: "CUSTOMER_NOT_FOUND",
  message: {
    zh: "客戶不存在",
    en: "Customer not found"
  }
}
```

### 4. 效能問題

#### 4.1 N+1 查詢問題

**問題**: 取得報價單清單時，每個報價單再查詢客戶

```typescript
// ❌ N+1 問題
const quotations = await getQuotations(userId)
for (const q of quotations) {
  q.customer = await getCustomer(q.customer_id)  // N 次查詢
}
```

**建議**: 使用 JOIN 或 批次查詢
```typescript
// ✅ 單次查詢
const quotations = await query(`
  SELECT q.*,
         c.name as customer_name,
         c.email as customer_email
  FROM quotations q
  JOIN customers c ON q.customer_id = c.id
  WHERE q.user_id = $1
`, [userId])
```

#### 4.2 缺少快取

**建議**: 為不常變動的資料添加快取

```typescript
// Redis 快取範例
import { redis } from '@/lib/redis'

export async function getExchangeRates(baseCurrency: string) {
  const cacheKey = `exchange_rates:${baseCurrency}`

  // 嘗試從快取取得
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // 查詢資料庫
  const rates = await fetchRatesFromDB(baseCurrency)

  // 快取 1 小時
  await redis.setex(cacheKey, 3600, JSON.stringify(rates))

  return rates
}
```

#### 4.3 缺少資料庫索引優化

**建議**: 為常用查詢欄位添加索引

```sql
-- 報價單搜尋優化
CREATE INDEX idx_quotations_search
ON quotations USING GIN (to_tsvector('english', quotation_number));

-- 日期範圍查詢優化
CREATE INDEX idx_quotations_date_range
ON quotations (user_id, issue_date DESC);

-- 狀態篩選優化
CREATE INDEX idx_quotations_status_user
ON quotations (status, user_id);
```

### 5. 安全性問題

#### 5.1 缺少速率限制

**問題**: 目前只有批次操作有速率限制

**建議**: 所有變更操作都應有速率限制

```typescript
// 建議的限制
POST /api/customers        → 60 requests/minute
POST /api/quotations       → 30 requests/minute
POST /api/quotations/batch → 5 requests/minute
GET  /api/*                → 300 requests/minute
```

#### 5.2 檔案上傳未完整保護

**問題**: Logo、簽章上傳缺少完整驗證

**建議**:
- 檔案類型驗證
- 檔案大小限制
- 惡意檔案掃描
- 檔案名稱淨化

#### 5.3 敏感欄位記錄

**問題**: 稽核日誌可能包含敏感資料

**建議**: 遮蔽敏感欄位

```typescript
function sanitizeForAudit(data: any) {
  const sanitized = { ...data }

  // 遮蔽敏感欄位
  if (sanitized.password) sanitized.password = '***'
  if (sanitized.credit_card) sanitized.credit_card = '***'

  return sanitized
}
```

### 6. 文件缺口

#### 6.1 缺少 OpenAPI/Swagger 文件

**建議**: 使用 OpenAPI 3.0 規範產生 API 文件

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Quotation System API
  version: 1.0.0
paths:
  /api/customers:
    get:
      summary: Get all customers
      tags:
        - Customers
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Customer'
```

#### 6.2 缺少變更日誌

**建議**: 維護 API CHANGELOG

```markdown
# API Changelog

## [1.1.0] - 2025-11-01
### Added
- POST /api/quotations/[id]/duplicate - 複製報價單
- GET /api/customers/[id]/stats - 客戶統計

### Changed
- PUT /api/quotations/[id] - 新增 payment_frequency 欄位

### Deprecated
- GET /api/user-info - 請改用 GET /api/me

### Removed
- DELETE /api/customers/bulk - 請改用批次端點

### Fixed
- 修正報價單項目排序問題

### Security
- 新增產品成本價的存取控制
```

### 7. 測試覆蓋

**建議實作的測試**:

```typescript
// tests/api/customers.test.ts
describe('Customers API', () => {
  describe('POST /api/customers', () => {
    it('should create customer with valid data', async () => {
      const response = await apiClient.post('/customers', validData)
      expect(response.status).toBe(201)
      expect(response.data).toHaveProperty('id')
    })

    it('should reject invalid email', async () => {
      const response = await apiClient.post('/customers', {
        ...validData,
        email: 'invalid-email'
      })
      expect(response.status).toBe(400)
      expect(response.error).toContain('email')
    })

    it('should require authentication', async () => {
      const response = await apiClient.post('/customers', validData, {
        auth: false
      })
      expect(response.status).toBe(401)
    })
  })
})
```

---

## 附錄

### A. 完整型別定義檔案位置

```
types/
  ├── database.types.ts        # 資料庫型別
  ├── extended.types.ts        # 擴展型別
  ├── rbac.types.ts           # RBAC 型別
  └── api.types.ts            # API 型別 (建議新增)
```

### B. API 測試工具

**推薦工具**:
- Thunder Client (VS Code Extension)
- Postman
- Insomnia
- REST Client (VS Code Extension)

**Thunder Client 範例集合**:
```json
{
  "clientName": "Thunder Client",
  "collectionName": "Quotation System API",
  "requests": [
    {
      "name": "Get Customers",
      "method": "GET",
      "url": "{{baseUrl}}/api/customers",
      "headers": [
        {
          "name": "Authorization",
          "value": "Bearer {{token}}"
        }
      ]
    }
  ]
}
```

### C. 環境設定範例

```bash
# .env.local
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Exchange Rate API
EXCHANGE_RATE_API_KEY=xxx
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4

# Email (Resend)
RESEND_API_KEY=re_xxx
FROM_EMAIL=noreply@example.com

# Feature Flags
ENABLE_PDF_EXPORT=true
ENABLE_BATCH_OPERATIONS=true
MAX_BATCH_SIZE=20

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Vercel Cron Secret
CRON_SECRET=xxx
```

### D. 資料庫 Migration 指令

```bash
# 建立新 Migration
npm run db:create-migration "add_payment_schedules"

# 執行 Migration
npm run db:migrate

# 回滾 Migration
npm run db:rollback

# 查看狀態
npm run db:status

# 產生型別定義
npm run db:generate-types
```

### E. 相關文件連結

- **主專案 README**: `/README.md`
- **Supabase 指南**: `/SUPABASE.md`
- **開發路線圖**: `/ROADMAP.md`
- **變更日誌**: `/CHANGELOG.md`
- **問題記錄**: `/ISSUELOG.md`
- **資料庫 Schema**: `/supabase-schema.sql`

---

## 總結

### 優點
✅ 完整的 CRUD 操作
✅ 型別安全 (100% TypeScript)
✅ 多租戶隔離
✅ RBAC 權限系統
✅ 雙語支援
✅ 欄位白名單驗證
✅ 參數化查詢

### 待改進
⚠️ 缺少分頁支援
⚠️ 缺少搜尋功能
⚠️ 回應格式不統一
⚠️ N+1 查詢問題
⚠️ 缺少快取機制
⚠️ 速率限制不完整
⚠️ 缺少 API 文件
⚠️ 測試覆蓋不足

### 建議優先處理
1. **分頁和搜尋** (影響使用體驗)
2. **回應格式統一** (降低前端複雜度)
3. **效能優化** (N+1 查詢、索引、快取)
4. **速率限制** (安全性)
5. **OpenAPI 文件** (團隊協作)

---

**文件維護者**: Claude
**最後更新**: 2025-10-24
**版本**: 1.0.0
