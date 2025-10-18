# Hooks 與組件使用指南

本文檔說明三級權限系統的前端 Hooks 和組件的使用方式。

## 目錄

1. [Hooks](#hooks)
   - [usePermissions](#usepermissions)
   - [useCompanies](#usecompanies)
   - [useManageableCompanies](#usemanageablecompanies)
   - [useCompanyMembers](#usecompanymembers)
2. [組件](#組件)
   - [RequirePermission](#requirepermission)
   - [CompanySelector](#companyselector)
   - [RoleSelector](#roleselector)
   - [MemberList](#memberlist)
3. [使用範例](#使用範例)

---

## Hooks

### usePermissions

取得當前使用者的完整權限資訊。

**位置**：`hooks/permission/usePermissions.ts`

#### 回傳值

```typescript
{
  permissions: UserPermissions | null;    // 使用者權限資料
  loading: boolean;                       // 載入狀態
  error: Error | null;                    // 錯誤訊息
  refetch: () => Promise<void>;           // 重新載入
  hasPermission: (permission: string, companyId?: string) => boolean;
  isSuperAdmin: boolean;                  // 是否為超級管理員
  isCompanyOwner: (companyId: string) => boolean;
  getCompanyRole: (companyId: string) => RoleName | null;
}
```

#### 使用範例

```tsx
import { usePermissions } from '@/hooks/permission';

function MyComponent() {
  const {
    permissions,
    loading,
    hasPermission,
    isSuperAdmin,
    isCompanyOwner
  } = usePermissions();

  if (loading) return <div>載入中...</div>;

  return (
    <div>
      {isSuperAdmin && <div>您是超級管理員</div>}

      {hasPermission('products.create') && (
        <button>建立產品</button>
      )}

      {isCompanyOwner('company-id-123') && (
        <button>管理公司</button>
      )}
    </div>
  );
}
```

---

### useCompanies

取得使用者所屬的公司列表。

**位置**：`hooks/permission/useCompanies.ts`

#### 回傳值

```typescript
{
  companies: UserCompany[];              // 公司列表
  loading: boolean;                      // 載入狀態
  error: Error | null;                   // 錯誤訊息
  refetch: () => Promise<void>;          // 重新載入
  total: number;                         // 公司總數
  getCompany: (companyId: string) => UserCompany | undefined;
}
```

#### 使用範例

```tsx
import { useCompanies } from '@/hooks/permission';

function CompanyList() {
  const { companies, loading, error } = useCompanies();

  if (loading) return <div>載入中...</div>;
  if (error) return <div>錯誤：{error.message}</div>;

  return (
    <ul>
      {companies.map(company => (
        <li key={company.company_id}>
          {company.company_name}
          {company.is_owner && ' (Owner)'}
        </li>
      ))}
    </ul>
  );
}
```

---

### useManageableCompanies

取得使用者可以管理的公司列表。

**位置**：`hooks/permission/useManageableCompanies.ts`

#### 回傳值

```typescript
{
  companies: ManageableCompany[];        // 可管理的公司列表
  loading: boolean;                      // 載入狀態
  error: Error | null;                   // 錯誤訊息
  refetch: () => Promise<void>;          // 重新載入
  total: number;                         // 公司總數
  canManageCompany: (companyId: string) => boolean;
  canManageMembers: (companyId: string) => boolean;
}
```

#### 使用範例

```tsx
import { useManageableCompanies } from '@/hooks/permission';

function AdminPanel() {
  const {
    companies,
    canManageMembers
  } = useManageableCompanies();

  return (
    <div>
      {companies.map(company => (
        <div key={company.company_id}>
          <h3>{company.company_name}</h3>
          {canManageMembers(company.company_id) && (
            <button>管理成員</button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### useCompanyMembers

取得特定公司的成員列表，並提供新增、更新、移除成員的功能。

**位置**：`hooks/permission/useCompanyMembers.ts`

#### 回傳值

```typescript
{
  members: CompanyMember[];              // 成員列表
  loading: boolean;                      // 載入狀態
  error: Error | null;                   // 錯誤訊息
  refetch: () => Promise<void>;          // 重新載入
  addMember: (data: AddMemberData) => Promise<void>;
  updateMemberRole: (userId: string, roleName: RoleName) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  getMember: (userId: string) => CompanyMember | undefined;
}
```

#### 使用範例

```tsx
import { useState } from 'react';
import { useCompanyMembers } from '@/hooks/permission';

function MembersPanel() {
  const [companyId, setCompanyId] = useState('company-123');
  const {
    members,
    loading,
    addMember,
    updateMemberRole,
    removeMember
  } = useCompanyMembers(companyId);

  const handleAddMember = async () => {
    await addMember({
      user_id: 'user-456',
      role_name: 'salesperson',
      full_name: '張三',
      display_name: '小張'
    });
  };

  const handleUpdateRole = async (userId: string) => {
    await updateMemberRole(userId, 'sales_manager');
  };

  const handleRemove = async (userId: string) => {
    if (window.confirm('確定要移除此成員？')) {
      await removeMember(userId);
    }
  };

  return (
    <div>
      {members.map(member => (
        <div key={member.user_id}>
          <span>{member.display_name}</span>
          <button onClick={() => handleUpdateRole(member.user_id)}>
            升級
          </button>
          <button onClick={() => handleRemove(member.user_id)}>
            移除
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 組件

### RequirePermission

權限保護組件，根據權限顯示或隱藏內容。

**位置**：`components/permission/RequirePermission.tsx`

#### Props

```typescript
{
  permission?: string;                   // 需要的權限
  requireSuperAdmin?: boolean;           // 是否需要超管權限
  requireCompanyOwner?: string;          // 需要的公司 owner 權限（公司 ID）
  companyId?: string;                    // 可選的公司 ID
  fallback?: ReactNode;                  // 權限不足時顯示的內容
  children: ReactNode;                   // 需要保護的子組件
  showFallbackOnLoading?: boolean;       // 載入時是否顯示 fallback
}
```

#### 使用範例

```tsx
import { RequirePermission, SuperAdminOnly, CompanyOwnerOnly } from '@/components/permission';

function App() {
  return (
    <div>
      {/* 需要特定權限 */}
      <RequirePermission
        permission="products.create"
        fallback={<div>您沒有建立產品的權限</div>}
      >
        <button>建立產品</button>
      </RequirePermission>

      {/* 僅超級管理員可見 */}
      <SuperAdminOnly fallback={<div>僅超管可見</div>}>
        <button>系統設定</button>
      </SuperAdminOnly>

      {/* 僅公司 owner 可見 */}
      <CompanyOwnerOnly companyId="company-123">
        <button>公司設定</button>
      </CompanyOwnerOnly>

      {/* 檢查公司層級權限 */}
      <RequirePermission
        permission="members.manage"
        companyId="company-123"
      >
        <button>管理成員</button>
      </RequirePermission>
    </div>
  );
}
```

---

### CompanySelector

公司選擇器，用於切換不同公司。

**位置**：`components/permission/CompanySelector.tsx`

#### Props

```typescript
{
  value?: string;                        // 當前選中的公司 ID
  onChange: (companyId: string) => void; // 選擇變更時的回調
  showLoading?: boolean;                 // 是否顯示載入中狀態
  className?: string;                    // 自訂樣式類別
  disabled?: boolean;                    // 是否禁用
  placeholder?: string;                  // placeholder 文字
}
```

#### 使用範例

```tsx
import { useState } from 'react';
import { CompanySelector, CompanySelectorWithLabel } from '@/components/permission';

function Dashboard() {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  return (
    <div>
      {/* 基本用法 */}
      <CompanySelector
        value={selectedCompanyId}
        onChange={setSelectedCompanyId}
      />

      {/* 帶標籤 */}
      <CompanySelectorWithLabel
        label="選擇您要管理的公司"
        value={selectedCompanyId}
        onChange={setSelectedCompanyId}
      />
    </div>
  );
}
```

---

### RoleSelector

角色選擇器，用於選擇使用者角色。

**位置**：`components/permission/RoleSelector.tsx`

#### Props

```typescript
{
  value?: RoleName;                      // 當前選中的角色
  onChange: (roleName: RoleName) => void;// 選擇變更時的回調
  disabled?: boolean;                    // 是否禁用
  className?: string;                    // 自訂樣式類別
  placeholder?: string;                  // placeholder 文字
  excludeSuperAdmin?: boolean;           // 是否排除超管角色
  excludeOwner?: boolean;                // 是否排除 owner 角色
  showDescription?: boolean;             // 是否顯示角色描述
}
```

#### 使用範例

```tsx
import { useState } from 'react';
import {
  RoleSelector,
  RoleSelectorWithLabel,
  RoleBadge,
  AVAILABLE_ROLES
} from '@/components/permission';
import type { RoleName } from '@/types/extended.types';

function AddMemberForm() {
  const [selectedRole, setSelectedRole] = useState<RoleName>('salesperson');

  return (
    <div>
      {/* 基本用法 */}
      <RoleSelector
        value={selectedRole}
        onChange={setSelectedRole}
        excludeOwner
      />

      {/* 帶標籤和描述 */}
      <RoleSelectorWithLabel
        label="選擇成員角色"
        value={selectedRole}
        onChange={setSelectedRole}
        showDescription
      />

      {/* 角色徽章 */}
      <RoleBadge role={selectedRole} />

      {/* 取得所有可用角色 */}
      {AVAILABLE_ROLES.map(role => (
        <div key={role.name}>
          {role.label} - {role.description}
        </div>
      ))}
    </div>
  );
}
```

---

### MemberList

顯示公司成員列表，包含編輯和刪除功能。

**位置**：`components/permission/MemberList.tsx`

#### Props

```typescript
{
  companyId: string | null;              // 公司 ID
  canEdit?: boolean;                     // 是否可以編輯成員
  className?: string;                    // 自訂樣式類別
  onDeleteConfirm?: (userId: string, userName: string) => Promise<boolean>;
}
```

#### 使用範例

```tsx
import { useState } from 'react';
import { MemberList } from '@/components/permission';
import { CompanySelector } from '@/components/permission';

function MembersPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const handleDeleteConfirm = async (userId: string, userName: string) => {
    // 自訂確認對話框
    return window.confirm(`確定要移除「${userName}」嗎？`);
  };

  return (
    <div>
      <h1>公司成員管理</h1>

      <CompanySelector
        value={selectedCompanyId || ''}
        onChange={setSelectedCompanyId}
      />

      <MemberList
        companyId={selectedCompanyId}
        canEdit={true}
        onDeleteConfirm={handleDeleteConfirm}
        className="mt-4"
      />
    </div>
  );
}
```

---

## 使用範例

### 範例 1：完整的成員管理頁面

```tsx
'use client';

import { useState } from 'react';
import {
  CompanySelector,
  MemberList,
  RequirePermission,
  RoleSelector
} from '@/components/permission';
import { useCompanyMembers, useManageableCompanies } from '@/hooks/permission';
import type { RoleName } from '@/types/extended.types';

export default function MembersManagementPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { canManageMembers } = useManageableCompanies();
  const { addMember } = useCompanyMembers(selectedCompanyId);

  const handleAddMember = async (data: {
    user_id: string;
    role_name: RoleName;
    full_name: string;
  }) => {
    await addMember(data);
    setShowAddModal(false);
  };

  const canEdit = selectedCompanyId ? canManageMembers(selectedCompanyId) : false;

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">成員管理</h1>

        <RequirePermission
          permission="members.create"
          companyId={selectedCompanyId || undefined}
        >
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            新增成員
          </button>
        </RequirePermission>
      </div>

      <div className="mb-6">
        <CompanySelector
          value={selectedCompanyId || ''}
          onChange={setSelectedCompanyId}
        />
      </div>

      <MemberList
        companyId={selectedCompanyId}
        canEdit={canEdit}
      />

      {/* 新增成員的 Modal (省略實作細節) */}
    </div>
  );
}
```

### 範例 2：權限檢查的按鈕

```tsx
import { usePermissions } from '@/hooks/permission';
import { RequirePermission } from '@/components/permission';

function ActionButtons({ companyId }: { companyId: string }) {
  const { hasPermission, isCompanyOwner } = usePermissions();

  return (
    <div className="space-x-2">
      {/* 方式 1：使用 hook 檢查 */}
      {hasPermission('products.create', companyId) && (
        <button>建立產品</button>
      )}

      {/* 方式 2：使用組件檢查 */}
      <RequirePermission permission="customers.delete" companyId={companyId}>
        <button>刪除客戶</button>
      </RequirePermission>

      {/* 方式 3：組合檢查 */}
      {(hasPermission('company.settings', companyId) || isCompanyOwner(companyId)) && (
        <button>公司設定</button>
      )}
    </div>
  );
}
```

### 範例 3：依角色顯示不同介面

```tsx
import { usePermissions } from '@/hooks/permission';

function Dashboard() {
  const { permissions, isSuperAdmin, getCompanyRole } = usePermissions();

  if (!permissions) return null;

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  const role = getCompanyRole('current-company-id');

  switch (role) {
    case 'company_owner':
      return <OwnerDashboard />;
    case 'sales_manager':
      return <ManagerDashboard />;
    case 'salesperson':
      return <SalespersonDashboard />;
    case 'accountant':
      return <AccountantDashboard />;
    default:
      return <DefaultDashboard />;
  }
}
```

---

## 最佳實踐

### 1. 權限檢查位置

- **UI 層**：使用 `RequirePermission` 組件或 `usePermissions` hook
- **API 層**：永遠在後端進行權限驗證（雙重保險）

### 2. 錯誤處理

```tsx
const { permissions, loading, error, refetch } = usePermissions();

if (error) {
  return (
    <div>
      <p>載入失敗：{error.message}</p>
      <button onClick={refetch}>重試</button>
    </div>
  );
}
```

### 3. 載入狀態

```tsx
if (loading) {
  return <LoadingSpinner />;
}
```

### 4. 組合權限檢查

```tsx
<RequirePermission
  permission="products.create"
  fallback={
    <SuperAdminOnly>
      <button>建立產品（超管）</button>
    </SuperAdminOnly>
  }
>
  <button>建立產品</button>
</RequirePermission>
```

---

## 下一步

現在已經完成 Phase 3，接下來的開發步驟：

1. ✅ Phase 1: 資料庫與後端設定
2. ✅ Phase 2: API 端點開發
3. ✅ Phase 3: Hooks 與組件
4. ⏳ Phase 4: 超級管理員控制台
5. ⏳ Phase 5: 公司成員管理介面
6. ⏳ Phase 6: 測試與驗證
7. ⏳ Phase 7: 文檔與部署
