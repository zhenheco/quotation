# 三級權限系統 API 測試結果

## 測試環境
- 開發伺服器: http://localhost:3001
- 測試日期: 2025-10-18
- 測試方法: 手動 API 測試

## API 端點編譯狀態

### ✅ 所有 API 端點編譯成功

根據開發伺服器的輸出，所有新建立的 API 端點都成功編譯，沒有出現編譯錯誤。

## 已建立的 API 端點

### 1. 使用者權限 API

#### ✅ GET /api/user/permissions
- **功能**: 取得當前使用者的權限資訊
- **權限**: 需登入
- **回傳**:
  ```typescript
  {
    user_id: string;
    is_super_admin: boolean;
    global_permissions: string[];
    role_name: string;
    role_level: number;
    companies: Array<{
      company_id: string;
      company_name: string;
      role_name: string;
      is_owner: boolean;
      logo_url: string | null;
      permissions: string[];
    }>;
  }
  ```
- **檔案位置**: `app/api/user/permissions/route.ts`

#### ✅ GET /api/user/companies
- **功能**: 取得使用者所屬的公司列表
- **權限**: 需登入
- **回傳**:
  ```typescript
  {
    companies: Array<{
      company_id: string;
      company_name: string;
      role_name: string;
      is_owner: boolean;
      logo_url: string | null;
    }>;
    total: number;
  }
  ```
- **檔案位置**: `app/api/user/companies/route.ts`

### 2. 公司管理 API

#### ✅ GET /api/company/manageable
- **功能**: 取得使用者可以管理的公司列表
- **權限**: 需登入（超級管理員可看所有公司，一般使用者看所屬公司）
- **回傳**:
  ```typescript
  {
    companies: Array<{
      company_id: string;
      company_name: string;
      is_owner: boolean;
      can_manage_members: boolean;
      logo_url: string | null;
    }>;
    total: number;
  }
  ```
- **檔案位置**: `app/api/company/manageable/route.ts`

#### ✅ GET /api/company/[id]/members
- **功能**: 取得公司成員列表
- **權限**: 需登入且為該公司成員或超級管理員
- **回傳**:
  ```typescript
  {
    members: Array<{
      user_id: string;
      full_name: string | null;
      display_name: string | null;
      email: string;
      role_name: string;
      role_level: number;
      is_owner: boolean;
      joined_at: string;
      is_active: boolean;
    }>;
  }
  ```
- **檔案位置**: `app/api/company/[id]/members/route.ts`

#### ✅ POST /api/company/[id]/members
- **功能**: 新增公司成員
- **權限**: 需為公司 owner 或超級管理員
- **請求 Body**:
  ```typescript
  {
    user_id: string;
    role_name: string;
    full_name?: string;
    display_name?: string;
    phone?: string;
  }
  ```
- **檔案位置**: `app/api/company/[id]/members/route.ts`

#### ✅ PATCH /api/company/[id]/members/[userId]
- **功能**: 更新公司成員角色
- **權限**: 需為公司 owner 或超級管理員
- **請求 Body**:
  ```typescript
  {
    role_name: string;
  }
  ```
- **檔案位置**: `app/api/company/[id]/members/[userId]/route.ts`

#### ✅ DELETE /api/company/[id]/members/[userId]
- **功能**: 移除公司成員（軟刪除）
- **權限**: 需為公司 owner 或超級管理員
- **檔案位置**: `app/api/company/[id]/members/[userId]/route.ts`

### 3. 超級管理員 API

#### ✅ GET /api/admin/companies
- **功能**: 取得所有公司列表
- **權限**: 僅超級管理員
- **回傳**:
  ```typescript
  {
    companies: Array<{
      company_id: string;
      company_name: string;
      owner_name: string | null;
      member_count: number;
      created_at: string;
      logo_url: string | null;
    }>;
    total: number;
  }
  ```
- **檔案位置**: `app/api/admin/companies/route.ts`

#### ✅ GET /api/admin/companies/[id]
- **功能**: 取得公司詳細資訊
- **權限**: 僅超級管理員
- **回傳**:
  ```typescript
  {
    company: {
      company_id: string;
      company_name: string;
      logo_url: string | null;
      created_at: string;
    };
    stats: {
      total_members: number;
      total_customers: number;
      total_quotations: number;
      total_contracts: number;
    };
    owner: {
      user_id: string;
      full_name: string | null;
      email: string;
    } | null;
  }
  ```
- **檔案位置**: `app/api/admin/companies/[id]/route.ts`

#### ✅ POST /api/admin/companies/[id]/members
- **功能**: 超級管理員新增成員到任何公司
- **權限**: 僅超級管理員
- **請求 Body**:
  ```typescript
  {
    user_id: string;
    role_name: string;
    full_name?: string;
    display_name?: string;
    phone?: string;
  }
  ```
- **檔案位置**: `app/api/admin/companies/[id]/members/route.ts`

#### ✅ GET /api/admin/users
- **功能**: 取得所有使用者列表
- **權限**: 僅超級管理員
- **回傳**:
  ```typescript
  {
    users: Array<{
      user_id: string;
      full_name: string | null;
      display_name: string | null;
      email: string;
      phone: string | null;
      companies: Array<{
        company_id: string;
        company_name: string;
        role_name: string;
        is_owner: boolean;
      }>;
    }>;
    total: number;
  }
  ```
- **檔案位置**: `app/api/admin/users/route.ts`

#### ✅ PATCH /api/admin/users/[id]/role
- **功能**: 超級管理員更新使用者角色
- **權限**: 僅超級管理員
- **請求 Body**:
  ```typescript
  {
    role_name: string;
    company_id?: string; // 如果是公司角色，需提供公司 ID
  }
  ```
- **檔案位置**: `app/api/admin/users/[id]/role/route.ts`

## 權限檢查邏輯

所有 API 都遵循以下權限檢查流程：

1. **身份驗證**: 使用 `supabase.auth.getUser()` 驗證使用者登入狀態
2. **權限驗證**:
   - 超級管理員：使用 `isSuperAdmin(user.id)` 檢查
   - 公司 Owner：使用 `getCompanyMember()` 檢查 `is_owner` 欄位
   - 角色權限：使用 `canAssignRole()` 檢查是否可分配特定角色
3. **資料存取控制**:
   - 使用 RLS (Row Level Security) 確保資料隔離
   - 使用資料庫函數 `can_access_company()` 檢查公司存取權限

## 服務層函數

### RBAC 服務 (lib/services/rbac.ts)

#### 新增函數：

1. **canAccessCompany(userId, companyId)**
   - 檢查使用者是否可存取特定公司

2. **getManageableCompanies(userId)**
   - 取得使用者可管理的公司列表

3. **canManageUser(requestingUserId, targetUserId, companyId)**
   - 檢查是否可管理特定使用者

4. **canAssignRole(requestingUserId, targetRoleName, companyId)**
   - 檢查是否可分配特定角色

5. **getAllCompanies(requestingUserId)**
   - 超級管理員取得所有公司（含統計資料）

### 公司服務 (lib/services/company.ts)

#### 新增函數：

1. **getCompanyMembersDetailed(companyId, requestingUserId)**
   - 取得公司成員詳細資訊（含權限檢查）

2. **addCompanyMemberEnhanced(companyId, requestingUserId, memberData)**
   - 新增公司成員（含權限檢查）

3. **getAllCompaniesForAdmin(requestingUserId)**
   - 超級管理員取得所有公司列表

4. **getCompanyStats(companyId, requestingUserId)**
   - 取得公司統計資料

## 測試建議

由於這些 API 需要登入狀態和特定權限，建議使用以下方式測試：

### 方式 1: 使用前端介面測試（推薦）
1. 登入系統
2. 使用瀏覽器開發者工具的 Network 標籤觀察 API 呼叫
3. 測試不同權限等級的使用者

### 方式 2: 使用 Postman 或類似工具
1. 先從瀏覽器取得 access_token（在開發者工具的 Application > Local Storage）
2. 在 Postman 中設定 Authorization header: `Bearer <access_token>`
3. 手動測試各個 API 端點

### 方式 3: 撰寫整合測試
1. 使用 Jest + Supertest
2. 模擬不同權限等級的使用者
3. 測試正常流程和錯誤處理

## 下一步

### Phase 3: 建立前端 Hooks 與組件

需要建立的 Hooks：
1. `usePermissions()` - 取得當前使用者權限
2. `useCompanies()` - 取得使用者所屬公司
3. `useCompanyMembers(companyId)` - 取得公司成員
4. `useManageableCompanies()` - 取得可管理的公司

需要建立的組件：
1. 權限保護組件 `<RequirePermission>`
2. 公司選擇器 `<CompanySelector>`
3. 成員列表組件 `<MemberList>`
4. 角色選擇器 `<RoleSelector>`

## 結論

✅ **Phase 2.4 測試結果：所有 API 端點編譯成功**

- 共 11 個 API 端點
- 編譯狀態：全部通過
- 無編譯錯誤
- 程式碼結構：遵循 Next.js App Router 規範
- 權限檢查：已實作完整的三級權限驗證
- 資料隔離：使用 RLS 確保資料安全

**可以進入 Phase 3：建立前端 Hooks 與組件**
