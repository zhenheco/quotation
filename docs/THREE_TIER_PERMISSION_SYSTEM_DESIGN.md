# 三層級權限管理系統 - 詳細技術設計文檔

## 文檔版本
- **版本**: 1.0.0
- **建立日期**: 2025-10-18
- **作者**: Claude Code
- **狀態**: 設計階段

---

## 目錄
1. [系統概述](#系統概述)
2. [當前架構分析](#當前架構分析)
3. [三層級權限設計](#三層級權限設計)
4. [資料庫設計](#資料庫設計)
5. [後端服務設計](#後端服務設計)
6. [API 設計](#api-設計)
7. [前端設計](#前端設計)
8. [實作步驟](#實作步驟)
9. [測試計劃](#測試計劃)

---

## 系統概述

### 需求摘要
實現三層級權限管理系統：

1. **超級管理員** (`acejou27@gmail.com`)
   - 系統最高權限
   - 可管理所有公司及其成員
   - 可設定任何使用者的權限
   - 跨公司操作能力

2. **公司負責人/老闆** (購買系統的客戶)
   - 管理自己的公司資訊
   - 新增、編輯、刪除公司成員帳號
   - 設定公司員工權限
   - 僅能管理所屬公司

3. **公司員工/使用者**
   - 依公司負責人設定的權限運作
   - 只能在授權範圍內操作
   - 資料限制在所屬公司內

### 技術棧
- **前端**: Next.js 15.5.5 (App Router)
- **資料庫**: PostgreSQL (Zeabur/Supabase)
- **認證**: Supabase Auth
- **語言**: TypeScript
- **樣式**: Tailwind CSS

---

## 當前架構分析

### ✅ 已完成的架構

#### 1. RBAC 系統 (002_rbac_fixed.sql)

**角色表 (roles)**
```sql
id | name           | level | name_zh      | name_en
---|----------------|-------|--------------|---------------
1  | super_admin    | 1     | 總管理員     | Super Admin
2  | company_owner  | 2     | 公司負責人   | Company Owner
3  | sales_manager  | 3     | 業務主管     | Sales Manager
4  | salesperson    | 4     | 業務人員     | Salesperson
5  | accountant     | 5     | 會計         | Accountant
```

**權限表 (permissions)** - 14 個權限：
- `products`: read, write, delete, read_cost
- `customers`: read, write, delete
- `quotations`: read, write, delete
- `contracts`: read, write, delete
- `payments`: read, write, delete
- `company_settings`: read, write
- `users`: read, write, delete, assign_roles

**關聯表**:
- `role_permissions`: 角色權限對應
- `user_roles`: 使用者角色分配
- `user_profiles`: 使用者資料

#### 2. 多公司架構 (003_multi_company_architecture.sql)

**公司表 (companies)**
```typescript
{
  id: UUID
  name: { zh: string, en: string }
  logo_url?: string
  signature_url?: string
  passbook_url?: string
  tax_id?: string
  bank_name?: string
  bank_account?: string
  bank_code?: string
  address?: { zh: string, en: string }
  phone?: string
  email?: string
  website?: string
  created_at: timestamp
  updated_at: timestamp
}
```

**公司成員表 (company_members)**
```typescript
{
  id: UUID
  company_id: UUID (FK → companies)
  user_id: UUID (FK → auth.users)
  role_id: UUID (FK → roles)
  is_owner: boolean      // 公司擁有者標記
  is_active: boolean     // 成員啟用狀態
  joined_at: timestamp
  updated_at: timestamp
  UNIQUE(company_id, user_id)
}
```

**業務資料表**: 所有表都有 `company_id`
- customers
- products
- quotations

**輔助函數**:
- `is_company_member(user_id, company_id)`: 檢查成員資格
- `get_user_companies(user_id)`: 取得使用者所屬公司
- `get_company_members(company_id)`: 取得公司成員

#### 3. 現有服務

**RBAC 服務** (`lib/services/rbac.ts`)
- `getUserPermissions(userId)`: 取得使用者權限
- `hasPermission(userId, resource, action)`: 檢查權限
- `isSuperAdmin(userId)`: 檢查超管身份
- `canManageUsers(userId)`: 檢查使用者管理權限
- `assignRoleToUser(userId, roleName, assignedBy)`: 分配角色

**公司服務** (`lib/services/company.ts`)
- `getUserCompanies(userId)`: 取得使用者公司
- `createCompany(userId, data)`: 建立公司
- `getCompanyMembers(companyId, userId)`: 取得成員
- `addCompanyMember(companyId, userId, newMemberUserId, roleId)`: 新增成員
- `updateCompanyMemberRole(...)`: 更新成員角色
- `removeCompanyMember(...)`: 移除成員

### ⚠️ 需要補充的部分

1. **超級管理員初始化**
   - 設定 acejou27@gmail.com 為 super_admin
   - Super admin 專用管理介面

2. **權限邏輯完善**
   - Super admin 跨公司權限檢查
   - Company owner 權限邊界控制
   - 資料隔離機制 (RLS policies)

3. **API 端點開發**
   - 超級管理員 API
   - 公司成員管理 API
   - 權限檢查 middleware

4. **前端功能**
   - 超級管理員控制台
   - 公司成員管理介面
   - 權限檢查 hooks
   - 條件式 UI 渲染

---

## 三層級權限設計

### 權限矩陣

| 功能 | Super Admin | Company Owner | Sales Manager | Salesperson | Accountant |
|------|-------------|---------------|---------------|-------------|------------|
| 管理所有公司 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 管理自己公司 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 新增/刪除公司成員 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 設定成員角色 | ✅ | ✅ (不含 owner) | ❌ | ❌ | ❌ |
| 查看所有公司資料 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 管理產品 | ✅ | ✅ | ✅ | 讀取 | 讀取 |
| 查看成本 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 管理客戶 | ✅ | ✅ | ✅ | ✅ | 讀取 |
| 管理報價單 | ✅ | ✅ | ✅ | ✅ | 讀取 |
| 管理合約 | ✅ | ✅ | ✅ | 讀取 | 讀取 |
| 管理付款 | ✅ | ✅ | 讀取 | 讀取 | ✅ |

### 權限檢查邏輯

```typescript
// 權限檢查優先順序
function canAccessResource(userId, resource, action, companyId?) {
  // 1. 檢查是否為 super_admin
  if (isSuperAdmin(userId)) {
    return true; // 超管可以存取所有資源
  }

  // 2. 檢查是否為該公司成員
  if (companyId && !isCompanyMember(userId, companyId)) {
    return false; // 不是成員，無法存取
  }

  // 3. 檢查角色權限
  return hasPermission(userId, resource, action);
}
```

### 資料隔離規則

1. **Super Admin**: 可以看到所有公司的所有資料
2. **Company Owner**: 只能看到自己公司的資料
3. **其他角色**: 只能看到所屬公司的資料，且受角色權限限制

---

## 資料庫設計

### 需要新增的 Migration (005_super_admin_setup.sql)

```sql
-- ============================================================================
-- Super Admin Setup and Enhanced Permissions
-- ============================================================================

-- 1. 設定超級管理員帳號
-- 注意：需要在執行前確保該使用者已在 Supabase Auth 中註冊
DO $$
DECLARE
  super_admin_email TEXT := 'acejou27@gmail.com';
  super_admin_user_id UUID;
  super_admin_role_id UUID;
BEGIN
  -- 從 auth.users 取得使用者 ID
  SELECT id INTO super_admin_user_id
  FROM auth.users
  WHERE email = super_admin_email;

  IF super_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Super admin user not found: %', super_admin_email;
  END IF;

  -- 取得 super_admin 角色 ID
  SELECT id INTO super_admin_role_id
  FROM roles
  WHERE name = 'super_admin';

  -- 建立使用者 profile（如果不存在）
  INSERT INTO user_profiles (user_id, full_name, display_name, is_active)
  VALUES (super_admin_user_id, '系統管理員', 'Admin', true)
  ON CONFLICT (user_id) DO UPDATE
  SET is_active = true;

  -- 分配 super_admin 角色
  INSERT INTO user_roles (user_id, role_id, assigned_by)
  VALUES (super_admin_user_id, super_admin_role_id, super_admin_user_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RAISE NOTICE 'Super admin setup completed for: %', super_admin_email;
END $$;

-- 2. 新增跨公司權限檢查函數
CREATE OR REPLACE FUNCTION can_access_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_super_admin BOOLEAN;
  is_member BOOLEAN;
BEGIN
  -- 檢查是否為超級管理員
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = 'super_admin'
  ) INTO is_super_admin;

  IF is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- 檢查是否為公司成員
  SELECT is_company_member(p_user_id, p_company_id) INTO is_member;
  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 新增取得可管理公司列表的函數
CREATE OR REPLACE FUNCTION get_manageable_companies(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name JSONB,
  role_name VARCHAR,
  is_owner BOOLEAN,
  can_manage_members BOOLEAN
) AS $$
DECLARE
  is_super_admin BOOLEAN;
BEGIN
  -- 檢查是否為超級管理員
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = 'super_admin'
  ) INTO is_super_admin;

  IF is_super_admin THEN
    -- 超管可以看到所有公司
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      'super_admin'::VARCHAR as role_name,
      false as is_owner,
      true as can_manage_members
    FROM companies c
    ORDER BY c.created_at DESC;
  ELSE
    -- 一般使用者只能看到所屬公司，且需要是 owner 才能管理
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      r.name as role_name,
      cm.is_owner,
      cm.is_owner as can_manage_members
    FROM companies c
    INNER JOIN company_members cm ON c.id = cm.company_id
    INNER JOIN roles r ON cm.role_id = r.id
    WHERE cm.user_id = p_user_id
    AND cm.is_active = true
    ORDER BY cm.is_owner DESC, cm.joined_at ASC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Row Level Security (RLS) 政策

-- 啟用 RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Companies 政策
CREATE POLICY companies_select_policy ON companies
  FOR SELECT
  USING (
    -- Super admin 可以看所有公司
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'super_admin'
    )
    OR
    -- 公司成員可以看自己的公司
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = companies.id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY companies_insert_policy ON companies
  FOR INSERT
  WITH CHECK (
    -- Super admin 可以建立
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'super_admin'
    )
    OR
    -- 任何認證使用者都可以建立公司（會自動成為 owner）
    auth.uid() IS NOT NULL
  );

CREATE POLICY companies_update_policy ON companies
  FOR UPDATE
  USING (
    -- Super admin 可以更新任何公司
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'super_admin'
    )
    OR
    -- Company owner 可以更新自己的公司
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = companies.id
      AND cm.user_id = auth.uid()
      AND cm.is_owner = true
      AND cm.is_active = true
    )
  );

-- Company Members 政策
CREATE POLICY company_members_select_policy ON company_members
  FOR SELECT
  USING (
    -- Super admin 可以看所有成員
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'super_admin'
    )
    OR
    -- 公司成員可以看同公司的成員
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY company_members_insert_policy ON company_members
  FOR INSERT
  WITH CHECK (
    -- Super admin 可以新增
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'super_admin'
    )
    OR
    -- Company owner 可以新增成員
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = auth.uid()
      AND cm.is_owner = true
      AND cm.is_active = true
    )
  );

CREATE POLICY company_members_update_policy ON company_members
  FOR UPDATE
  USING (
    -- Super admin 可以更新
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'super_admin'
    )
    OR
    -- Company owner 可以更新成員（但不能更改 owner 狀態）
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = auth.uid()
      AND cm.is_owner = true
      AND cm.is_active = true
    )
  );

-- Customers 政策（範例，其他業務表類似）
CREATE POLICY customers_select_policy ON customers
  FOR SELECT
  USING (can_access_company(auth.uid(), company_id));

CREATE POLICY customers_insert_policy ON customers
  FOR INSERT
  WITH CHECK (can_access_company(auth.uid(), company_id));

CREATE POLICY customers_update_policy ON customers
  FOR UPDATE
  USING (can_access_company(auth.uid(), company_id));

CREATE POLICY customers_delete_policy ON customers
  FOR DELETE
  USING (can_access_company(auth.uid(), company_id));

-- 完成
SELECT 'Super admin setup and RLS policies created successfully!' as status;
```

---

## 後端服務設計

### 1. 增強 RBAC 服務 (`lib/services/rbac.ts`)

```typescript
// 新增跨公司權限檢查
export async function canAccessCompany(
  userId: string,
  companyId: string
): Promise<boolean> {
  // 檢查是否為超管
  const isSuperAdminUser = await isSuperAdmin(userId);
  if (isSuperAdminUser) {
    return true;
  }

  // 檢查是否為公司成員
  const result = await query(
    `SELECT can_access_company($1, $2) as can_access`,
    [userId, companyId]
  );

  return result.rows[0]?.can_access || false;
}

// 取得可管理的公司列表
export async function getManageableCompanies(
  userId: string
): Promise<CompanyInfo[]> {
  const result = await query(
    `SELECT * FROM get_manageable_companies($1)`,
    [userId]
  );

  return result.rows;
}

// 檢查是否可以管理指定使用者
export async function canManageUser(
  requestingUserId: string,
  targetUserId: string,
  companyId?: string
): Promise<boolean> {
  // Super admin 可以管理任何人
  const isSuperAdminUser = await isSuperAdmin(requestingUserId);
  if (isSuperAdminUser) {
    return true;
  }

  // 不能管理自己
  if (requestingUserId === targetUserId) {
    return false;
  }

  // 如果指定了公司，檢查是否為該公司的 owner
  if (companyId) {
    const result = await query(
      `SELECT is_owner FROM company_members
       WHERE company_id = $1 AND user_id = $2 AND is_active = true`,
      [companyId, requestingUserId]
    );

    return result.rows[0]?.is_owner || false;
  }

  return false;
}

// 檢查角色分配權限
export async function canAssignRole(
  requestingUserId: string,
  targetRoleName: RoleName,
  companyId?: string
): Promise<boolean> {
  // Super admin 可以分配任何角色
  const isSuperAdminUser = await isSuperAdmin(requestingUserId);
  if (isSuperAdminUser) {
    return true;
  }

  // Company owner 只能分配 level >= 3 的角色
  if (companyId) {
    const member = await query(
      `SELECT cm.is_owner
       FROM company_members cm
       WHERE cm.company_id = $1 AND cm.user_id = $2 AND cm.is_active = true`,
      [companyId, requestingUserId]
    );

    if (member.rows[0]?.is_owner) {
      const role = await getRoleByName(targetRoleName);
      // Company owner 不能分配 super_admin 或 company_owner
      return role && role.level >= 3;
    }
  }

  return false;
}
```

### 2. 增強公司服務 (`lib/services/company.ts`)

```typescript
// 取得所有公司（僅 super admin）
export async function getAllCompanies(
  requestingUserId: string
): Promise<Company[]> {
  const isSuperAdminUser = await isSuperAdmin(requestingUserId);
  if (!isSuperAdminUser) {
    throw new Error('Only super admin can view all companies');
  }

  const result = await query(
    `SELECT * FROM companies ORDER BY created_at DESC`
  );

  return result.rows;
}

// 取得公司的所有成員（包含詳細資訊）
export async function getCompanyMembersDetailed(
  companyId: string,
  requestingUserId: string
): Promise<CompanyMemberDetailed[]> {
  // 檢查權限
  const canAccess = await canAccessCompany(requestingUserId, companyId);
  if (!canAccess) {
    throw new Error('You do not have access to this company');
  }

  const result = await query(
    `SELECT
      cm.id,
      cm.company_id,
      cm.user_id,
      cm.role_id,
      cm.is_owner,
      cm.is_active,
      cm.joined_at,
      up.full_name,
      up.display_name,
      up.email,
      up.phone,
      up.avatar_url,
      r.name as role_name,
      r.name_zh as role_name_zh,
      r.name_en as role_name_en,
      r.level as role_level
    FROM company_members cm
    LEFT JOIN user_profiles up ON cm.user_id = up.user_id
    LEFT JOIN roles r ON cm.role_id = r.id
    WHERE cm.company_id = $1
    ORDER BY cm.is_owner DESC, cm.joined_at ASC`,
    [companyId]
  );

  return result.rows;
}

// 新增成員（增強權限檢查）
export async function addCompanyMemberEnhanced(
  companyId: string,
  requestingUserId: string,
  newMemberData: {
    email: string;
    roleName: RoleName;
    fullName?: string;
    displayName?: string;
  }
): Promise<CompanyMember> {
  // 檢查是否可以管理此公司
  const isSuperAdminUser = await isSuperAdmin(requestingUserId);
  const member = await getCompanyMember(companyId, requestingUserId);

  if (!isSuperAdminUser && (!member || !member.is_owner)) {
    throw new Error('Insufficient permissions to add members');
  }

  // 檢查是否可以分配此角色
  const canAssign = await canAssignRole(
    requestingUserId,
    newMemberData.roleName,
    companyId
  );

  if (!canAssign) {
    throw new Error(`Cannot assign role: ${newMemberData.roleName}`);
  }

  // 從 auth.users 查找或建立使用者
  const userResult = await query(
    `SELECT id FROM auth.users WHERE email = $1`,
    [newMemberData.email]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found. Please ask them to sign up first.');
  }

  const newMemberUserId = userResult.rows[0].id;

  // 建立或更新 user profile
  await query(
    `INSERT INTO user_profiles (user_id, full_name, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE
     SET full_name = COALESCE($2, user_profiles.full_name),
         display_name = COALESCE($3, user_profiles.display_name)`,
    [newMemberUserId, newMemberData.fullName, newMemberData.displayName]
  );

  // 取得角色 ID
  const role = await getRoleByName(newMemberData.roleName);
  if (!role) {
    throw new Error(`Role not found: ${newMemberData.roleName}`);
  }

  // 新增到公司
  return addCompanyMember(
    companyId,
    requestingUserId,
    newMemberUserId,
    role.id
  );
}
```

---

## API 設計

### API 端點規劃

#### 1. 超級管理員 API (`/api/admin/*`)

```typescript
// GET /api/admin/companies
// 取得所有公司列表
// 權限: super_admin only
interface GetAllCompaniesResponse {
  companies: Company[];
  total: number;
}

// GET /api/admin/companies/[id]
// 取得特定公司詳情
// 權限: super_admin only
interface GetCompanyDetailResponse {
  company: Company;
  members: CompanyMemberDetailed[];
  stats: {
    totalMembers: number;
    activeMembers: number;
    totalCustomers: number;
    totalQuotations: number;
  };
}

// POST /api/admin/companies/[id]/members
// 新增公司成員
// 權限: super_admin only
interface AddCompanyMemberRequest {
  email: string;
  roleName: RoleName;
  fullName?: string;
  displayName?: string;
}

// PATCH /api/admin/users/[id]/role
// 更改使用者角色
// 權限: super_admin only
interface UpdateUserRoleRequest {
  roleName: RoleName;
  companyId?: string;
}

// GET /api/admin/users
// 取得所有使用者
// 權限: super_admin only
interface GetAllUsersResponse {
  users: UserWithCompanies[];
  total: number;
}
```

#### 2. 公司管理 API (`/api/company/*`)

```typescript
// GET /api/company/[id]/members
// 取得公司成員列表
// 權限: company member
interface GetCompanyMembersResponse {
  members: CompanyMemberDetailed[];
}

// POST /api/company/[id]/members
// 新增公司成員
// 權限: company owner or super_admin
interface AddMemberRequest {
  email: string;
  roleName: RoleName;
  fullName?: string;
  displayName?: string;
}

// PATCH /api/company/[id]/members/[userId]
// 更新成員角色
// 權限: company owner or super_admin
interface UpdateMemberRequest {
  roleName: RoleName;
}

// DELETE /api/company/[id]/members/[userId]
// 移除成員（停用）
// 權限: company owner or super_admin

// GET /api/company/manageable
// 取得可管理的公司列表
// 權限: authenticated
interface GetManageableCompaniesResponse {
  companies: CompanyInfo[];
}
```

#### 3. 使用者權限 API (`/api/user/*`)

```typescript
// GET /api/user/permissions
// 取得當前使用者權限
interface GetUserPermissionsResponse {
  userId: string;
  companies: {
    companyId: string;
    roleName: string;
    isOwner: boolean;
    permissions: string[];
  }[];
  isSuperAdmin: boolean;
}

// GET /api/user/companies
// 取得使用者所屬公司
interface GetUserCompaniesResponse {
  companies: UserCompany[];
}
```

### API 實作範例

```typescript
// app/api/admin/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isSuperAdmin } from '@/lib/services/rbac';
import { getAllCompanies } from '@/lib/services/company';

export async function GET(request: NextRequest) {
  try {
    // 驗證 session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin only' },
        { status: 403 }
      );
    }

    // 取得所有公司
    const companies = await getAllCompanies(session.user.id);

    return NextResponse.json({
      companies,
      total: companies.length
    });

  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 前端設計

### 頁面結構

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── dashboard/          # 一般使用者儀表板
│   ├── admin/              # 超級管理員控制台
│   │   ├── companies/      # 所有公司管理
│   │   ├── users/          # 所有使用者管理
│   │   └── settings/       # 系統設定
│   ├── company/
│   │   ├── [id]/
│   │   │   ├── settings/   # 公司設定
│   │   │   └── members/    # 成員管理
│   │   └── select/         # 公司選擇
│   ├── customers/
│   ├── products/
│   ├── quotations/
│   └── settings/
```

### React Hooks 設計

```typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchPermissions();
    }
  }, [session]);

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/user/permissions');
      const data = await res.json();
      setPermissions(data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!permissions) return false;
    if (permissions.isSuperAdmin) return true;

    // 檢查當前公司的權限
    const currentCompany = permissions.companies.find(
      c => c.companyId === session?.activeCompanyId
    );

    return currentCompany?.permissions.includes(`${resource}:${action}`) || false;
  };

  const canManageCompany = (companyId: string): boolean => {
    if (!permissions) return false;
    if (permissions.isSuperAdmin) return true;

    const company = permissions.companies.find(c => c.companyId === companyId);
    return company?.isOwner || false;
  };

  return {
    permissions,
    loading,
    isSuperAdmin: permissions?.isSuperAdmin || false,
    hasPermission,
    canManageCompany
  };
}

// hooks/useCompanyMembers.ts
export function useCompanyMembers(companyId: string) {
  const [members, setMembers] = useState<CompanyMemberDetailed[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/company/${companyId}/members`);
      const data = await res.json();
      setMembers(data.members);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (memberData: AddMemberRequest) => {
    const res = await fetch(`/api/company/${companyId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData)
    });

    if (!res.ok) {
      throw new Error('Failed to add member');
    }

    await fetchMembers(); // Refresh
  };

  const updateMemberRole = async (userId: string, roleName: RoleName) => {
    const res = await fetch(`/api/company/${companyId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleName })
    });

    if (!res.ok) {
      throw new Error('Failed to update member role');
    }

    await fetchMembers(); // Refresh
  };

  const removeMember = async (userId: string) => {
    const res = await fetch(`/api/company/${companyId}/members/${userId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error('Failed to remove member');
    }

    await fetchMembers(); // Refresh
  };

  useEffect(() => {
    if (companyId) {
      fetchMembers();
    }
  }, [companyId]);

  return {
    members,
    loading,
    addMember,
    updateMemberRole,
    removeMember,
    refresh: fetchMembers
  };
}
```

### 條件式 UI 組件

```typescript
// components/auth/PermissionGate.tsx
interface PermissionGateProps {
  resource: string;
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  resource,
  action,
  fallback,
  children
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!hasPermission(resource, action)) {
    return fallback || null;
  }

  return <>{children}</>;
}

// 使用範例
<PermissionGate resource="users" action="write">
  <Button onClick={handleAddMember}>新增成員</Button>
</PermissionGate>

// components/auth/SuperAdminOnly.tsx
export function SuperAdminOnly({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = usePermissions();

  if (loading) return <LoadingSpinner />;
  if (!isSuperAdmin) return null;

  return <>{children}</>;
}
```

### 超級管理員控制台頁面

```typescript
// app/(dashboard)/admin/companies/page.tsx
'use client';

export default function AdminCompaniesPage() {
  const { isSuperAdmin, loading } = usePermissions();
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [isSuperAdmin]);

  const fetchCompanies = async () => {
    const res = await fetch('/api/admin/companies');
    const data = await res.json();
    setCompanies(data.companies);
  };

  if (loading) return <LoadingSpinner />;

  if (!isSuperAdmin) {
    return <Forbidden />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">所有公司管理</h1>

      <div className="grid grid-cols-1 gap-4">
        {companies.map(company => (
          <CompanyCard
            key={company.id}
            company={company}
            onSelect={() => router.push(`/admin/companies/${company.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 公司成員管理頁面

```typescript
// app/(dashboard)/company/[id]/members/page.tsx
'use client';

export default function CompanyMembersPage({
  params
}: {
  params: { id: string }
}) {
  const { canManageCompany } = usePermissions();
  const {
    members,
    loading,
    addMember,
    updateMemberRole,
    removeMember
  } = useCompanyMembers(params.id);

  const [showAddDialog, setShowAddDialog] = useState(false);

  const isManager = canManageCompany(params.id);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">成員管理</h1>
        {isManager && (
          <Button onClick={() => setShowAddDialog(true)}>
            新增成員
          </Button>
        )}
      </div>

      <MembersTable
        members={members}
        canManage={isManager}
        onUpdateRole={updateMemberRole}
        onRemove={removeMember}
      />

      <AddMemberDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={addMember}
      />
    </div>
  );
}
```

---

## 實作步驟

### Phase 1: 資料庫與後端基礎 (2-3 天)

**步驟 1.1**: 執行資料庫 migration
- [ ] 建立 `migrations/005_super_admin_setup.sql`
- [ ] 執行 migration 設定超管帳號
- [ ] 驗證 RLS 政策生效

**步驟 1.2**: 增強後端服務
- [ ] 更新 `lib/services/rbac.ts`
  - 新增 `canAccessCompany()`
  - 新增 `getManageableCompanies()`
  - 新增 `canManageUser()`
  - 新增 `canAssignRole()`
- [ ] 更新 `lib/services/company.ts`
  - 新增 `getAllCompanies()`
  - 新增 `getCompanyMembersDetailed()`
  - 新增 `addCompanyMemberEnhanced()`

**步驟 1.3**: 單元測試
- [ ] 測試超管權限檢查
- [ ] 測試跨公司存取
- [ ] 測試資料隔離

### Phase 2: API 端點開發 (2-3 天)

**步驟 2.1**: 超級管理員 API
- [ ] `GET /api/admin/companies`
- [ ] `GET /api/admin/companies/[id]`
- [ ] `POST /api/admin/companies/[id]/members`
- [ ] `GET /api/admin/users`
- [ ] `PATCH /api/admin/users/[id]/role`

**步驟 2.2**: 公司管理 API
- [ ] `GET /api/company/[id]/members`
- [ ] `POST /api/company/[id]/members`
- [ ] `PATCH /api/company/[id]/members/[userId]`
- [ ] `DELETE /api/company/[id]/members/[userId]`
- [ ] `GET /api/company/manageable`

**步驟 2.3**: 使用者權限 API
- [ ] `GET /api/user/permissions`
- [ ] `GET /api/user/companies`

**步驟 2.4**: API 測試
- [ ] 使用 Postman/Thunder Client 測試所有端點
- [ ] 驗證權限檢查邏輯

### Phase 3: 前端 Hooks 與組件 (2 天)

**步驟 3.1**: 建立 Hooks
- [ ] `hooks/usePermissions.ts`
- [ ] `hooks/useCompanyMembers.ts`
- [ ] `hooks/useSuperAdmin.ts`

**步驟 3.2**: 建立通用組件
- [ ] `components/auth/PermissionGate.tsx`
- [ ] `components/auth/SuperAdminOnly.tsx`
- [ ] `components/company/MembersTable.tsx`
- [ ] `components/company/AddMemberDialog.tsx`
- [ ] `components/company/CompanyCard.tsx`

### Phase 4: 超級管理員介面 (2 天)

**步驟 4.1**: 控制台頁面
- [ ] `app/(dashboard)/admin/layout.tsx`
- [ ] `app/(dashboard)/admin/page.tsx` (Dashboard)
- [ ] `app/(dashboard)/admin/companies/page.tsx`
- [ ] `app/(dashboard)/admin/companies/[id]/page.tsx`
- [ ] `app/(dashboard)/admin/users/page.tsx`

**步驟 4.2**: 樣式與 UX
- [ ] 使用 Tailwind 美化介面
- [ ] 新增 loading 狀態
- [ ] 新增錯誤處理

### Phase 5: 公司管理介面 (1-2 天)

**步驟 5.1**: 成員管理頁面
- [ ] `app/(dashboard)/company/[id]/members/page.tsx`
- [ ] `app/(dashboard)/company/[id]/settings/page.tsx`

**步驟 5.2**: 條件式 UI
- [ ] 根據權限顯示/隱藏按鈕
- [ ] 新增權限提示訊息

### Phase 6: 測試與驗證 (2 天)

**步驟 6.1**: 功能測試
- [ ] 超管登入測試
- [ ] 超管管理所有公司測試
- [ ] 公司負責人管理成員測試
- [ ] 員工權限限制測試

**步驟 6.2**: 邊界測試
- [ ] 嘗試越權操作
- [ ] 測試資料隔離
- [ ] 測試角色變更

**步驟 6.3**: 使用者體驗測試
- [ ] 不同角色的完整流程
- [ ] 錯誤訊息是否清楚

### Phase 7: 文檔與部署 (1 天)

**步驟 7.1**: 更新文檔
- [ ] 更新 ROADMAP.md
- [ ] 更新 CHANGELOG.md
- [ ] 新增使用手冊

**步驟 7.2**: 部署
- [ ] 部署到 staging 環境測試
- [ ] 部署到 production

---

## 測試計劃

### 測試案例

#### TC-001: 超級管理員完整權限
**前置條件**: acejou27@gmail.com 已設定為 super_admin
**步驟**:
1. 使用超管帳號登入
2. 訪問 `/admin/companies`
3. 選擇任一公司
4. 新增/編輯/刪除成員
5. 變更成員角色（包括設為 company_owner）

**預期結果**:
- 可以看到所有公司
- 可以管理任何公司的成員
- 可以分配任何角色

#### TC-002: 公司負責人權限範圍
**前置條件**: 使用者為某公司的 owner
**步驟**:
1. 登入公司負責人帳號
2. 訪問 `/company/[id]/members`
3. 嘗試新增成員
4. 嘗試設定成員為 sales_manager
5. 嘗試設定成員為 company_owner（應失敗）
6. 嘗試訪問其他公司的頁面（應被拒絕）

**預期結果**:
- 只能看到自己的公司
- 可以新增成員並設定角色（level >= 3）
- 不能將成員設為 company_owner
- 無法存取其他公司資料

#### TC-003: 員工權限限制
**前置條件**: 使用者為 salesperson 角色
**步驟**:
1. 登入業務人員帳號
2. 嘗試訪問 `/company/[id]/members`（應無權限）
3. 嘗試建立報價單（應成功）
4. 嘗試查看產品成本（應失敗）
5. 嘗試訪問其他公司的客戶（應被拒絕）

**預期結果**:
- 無法管理成員
- 可以執行業務操作
- 看不到成本資訊
- 資料限制在所屬公司內

#### TC-004: 資料隔離測試
**前置條件**: 兩個不同公司
**步驟**:
1. 公司 A 的業務建立客戶 X
2. 公司 B 的業務嘗試查看客戶 X
3. 超管查看客戶 X

**預期結果**:
- 公司 B 看不到客戶 X
- 超管可以看到客戶 X

---

## 附錄

### 常見問題 (FAQ)

**Q1: 如果超管帳號的 email 需要變更怎麼辦？**
A: 執行以下 SQL:
```sql
-- 移除舊超管角色
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = '舊email@example.com')
AND role_id = (SELECT id FROM roles WHERE name = 'super_admin');

-- 新增新超管角色
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
  (SELECT id FROM auth.users WHERE email = '新email@example.com'),
  (SELECT id FROM roles WHERE name = 'super_admin'),
  (SELECT id FROM auth.users WHERE email = '新email@example.com');
```

**Q2: 公司負責人可以轉移 owner 身份嗎？**
A: 目前設計不支援。如需轉移，需超管協助：
```sql
-- 只有超管可以執行
UPDATE company_members
SET is_owner = false
WHERE company_id = '公司ID' AND user_id = '舊owner的user_id';

UPDATE company_members
SET is_owner = true
WHERE company_id = '公司ID' AND user_id = '新owner的user_id';
```

**Q3: 一個使用者可以屬於多個公司嗎？**
A: 可以！一個使用者可以是多個公司的成員，且在不同公司可以有不同角色。

**Q4: RLS 政策會影響效能嗎？**
A: 有輕微影響，但透過適當的索引（已建立）可以最小化。建議監控查詢效能。

---

## 版本歷史

| 版本 | 日期 | 變更內容 | 作者 |
|------|------|----------|------|
| 1.0.0 | 2025-10-18 | 初始版本 | Claude Code |

---

## 相關文件

- [ROADMAP.md](../ROADMAP.md) - 專案開發計劃
- [CHANGELOG.md](../CHANGELOG.md) - 變更歷史記錄
- [README.md](../README.md) - 專案說明

