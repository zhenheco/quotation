/**
 * Type definitions for Role-Based Access Control (RBAC) system
 */

// ============================================================================
// ROLES AND PERMISSIONS
// ============================================================================

export type RoleName =
  | 'super_admin'
  | 'company_owner'
  | 'sales_manager'
  | 'salesperson'
  | 'accountant';

export type PermissionResource =
  | 'products'
  | 'customers'
  | 'quotations'
  | 'contracts'
  | 'payments'
  | 'company_settings'
  | 'users';

export type PermissionAction =
  | 'read'
  | 'write'
  | 'delete'
  | 'read_cost'
  | 'assign_roles';

export interface Role {
  id: string;
  name: RoleName;
  name_zh: string;
  name_en: string;
  level: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  resource: PermissionResource;
  action: PermissionAction;
  name: string; // e.g., 'products:read'
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  department: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

export interface UserPermissions {
  user_id: string;
  role_name: RoleName;
  role_level: number;
  permissions: Set<string>; // e.g., Set(['products:read', 'products:write'])
}

export interface PermissionCheck {
  resource: PermissionResource;
  action: PermissionAction;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface UserWithRole extends UserProfile {
  roles: Role[];
  permissions: Permission[];
}

export const ROLE_LEVELS = {
  super_admin: 1,
  company_owner: 2,
  sales_manager: 3,
  salesperson: 4,
  accountant: 5,
} as const;

export const ROLE_DISPLAY_NAMES = {
  zh: {
    super_admin: '總管理員',
    company_owner: '公司負責人',
    sales_manager: '業務主管',
    salesperson: '業務人員',
    accountant: '會計',
  },
  en: {
    super_admin: 'Super Admin',
    company_owner: 'Company Owner',
    sales_manager: 'Sales Manager',
    salesperson: 'Salesperson',
    accountant: 'Accountant',
  },
} as const;
