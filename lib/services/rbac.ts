/**
 * Role-Based Access Control (RBAC) Service
 * Handles user roles, permissions, and access control
 */

import { query, getClient } from '../db/zeabur';
import type {
  Role,
  Permission,
  UserRole,
  UserProfile,
  UserWithRole,
  RoleName,
  PermissionResource,
  PermissionAction,
  UserPermissions,
} from '@/types/rbac.types';

// ============================================================================
// USER PROFILE
// ============================================================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const result = await query(
    `SELECT * FROM user_profiles WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

export async function createUserProfile(
  userId: string,
  data: {
    full_name?: string;
    display_name?: string;
    phone?: string;
    department?: string;
    avatar_url?: string;
  }
): Promise<UserProfile> {
  const result = await query(
    `INSERT INTO user_profiles (user_id, full_name, display_name, phone, department, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      data.full_name || null,
      data.display_name || null,
      data.phone || null,
      data.department || null,
      data.avatar_url || null,
    ]
  );

  return result.rows[0];
}

export async function updateUserProfile(
  userId: string,
  data: Partial<{
    full_name: string;
    display_name: string;
    phone: string;
    department: string;
    avatar_url: string;
    is_active: boolean;
  }>
): Promise<UserProfile> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    fields.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);

  const result = await query(
    `UPDATE user_profiles
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE user_id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('User profile not found');
  }

  return result.rows[0];
}

export async function updateLastLogin(userId: string): Promise<void> {
  await query(
    `UPDATE user_profiles
     SET last_login_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
}

// ============================================================================
// ROLES
// ============================================================================

export async function getAllRoles(): Promise<Role[]> {
  const result = await query(
    `SELECT * FROM roles ORDER BY level ASC`
  );

  return result.rows;
}

export async function getRoleByName(name: RoleName): Promise<Role | null> {
  const result = await query(
    `SELECT * FROM roles WHERE name = $1`,
    [name]
  );

  return result.rows[0] || null;
}

// ============================================================================
// USER ROLES
// ============================================================================

export async function getUserRoles(userId: string): Promise<Role[]> {
  const result = await query(
    `SELECT r.*
     FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1
     ORDER BY r.level ASC`,
    [userId]
  );

  return result.rows;
}

export async function assignRoleToUser(
  userId: string,
  roleName: RoleName,
  assignedBy: string
): Promise<UserRole> {
  // Get role ID from role name
  const role = await getRoleByName(roleName);
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  // Check if user already has this role
  const existing = await query(
    `SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2`,
    [userId, role.id]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Assign role
  const result = await query(
    `INSERT INTO user_roles (user_id, role_id, assigned_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, role.id, assignedBy]
  );

  return result.rows[0];
}

export async function removeRoleFromUser(
  userId: string,
  roleName: RoleName
): Promise<void> {
  const role = await getRoleByName(roleName);
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  await query(
    `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`,
    [userId, role.id]
  );
}

export async function getUserHighestRole(userId: string): Promise<Role | null> {
  const result = await query(
    `SELECT r.*
     FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1
     ORDER BY r.level ASC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

// ============================================================================
// PERMISSIONS
// ============================================================================

export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  const result = await query(
    `SELECT
       user_id,
       role_name,
       role_level,
       permission_name
     FROM user_permissions
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const permissions = new Set<string>(
    result.rows.map((row) => row.permission_name)
  );

  return {
    user_id: userId,
    role_name: result.rows[0].role_name,
    role_level: result.rows[0].role_level,
    permissions,
  };
}

export async function hasPermission(
  userId: string,
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  const permissionName = `${resource}:${action}`;

  const result = await query(
    `SELECT COUNT(*) as count
     FROM user_permissions
     WHERE user_id = $1 AND permission_name = $2`,
    [userId, permissionName]
  );

  return parseInt(result.rows[0].count) > 0;
}

export async function canAccessProductCost(userId: string): Promise<boolean> {
  // Only company_owner and accountant can see product costs
  const result = await query(
    `SELECT COUNT(*) as count
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1
       AND r.name IN ('super_admin', 'company_owner', 'accountant')`,
    [userId]
  );

  return parseInt(result.rows[0].count) > 0;
}

export async function canManageUsers(userId: string): Promise<boolean> {
  return await hasPermission(userId, 'users', 'write');
}

export async function canAssignRoles(userId: string): Promise<boolean> {
  return await hasPermission(userId, 'users', 'assign_roles');
}

// ============================================================================
// USER MANAGEMENT (for Super Admin and Company Owner)
// ============================================================================

export async function getAllUsers(requestingUserId: string): Promise<UserWithRole[]> {
  // Check permission
  const canView = await hasPermission(requestingUserId, 'users', 'read');
  if (!canView) {
    throw new Error('Insufficient permissions to view users');
  }

  const result = await query(
    `SELECT
       up.*,
       json_agg(DISTINCT r.*) FILTER (WHERE r.id IS NOT NULL) as roles,
       json_agg(DISTINCT p.*) FILTER (WHERE p.id IS NOT NULL) as permissions
     FROM user_profiles up
     LEFT JOIN user_roles ur ON up.user_id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     LEFT JOIN permissions p ON rp.permission_id = p.id
     GROUP BY up.id
     ORDER BY up.created_at DESC`
  );

  return result.rows;
}

export async function getUserById(
  userId: string,
  requestingUserId: string
): Promise<UserWithRole | null> {
  // Check permission
  const canView = await hasPermission(requestingUserId, 'users', 'read');
  if (!canView && userId !== requestingUserId) {
    throw new Error('Insufficient permissions to view user');
  }

  const result = await query(
    `SELECT
       up.*,
       json_agg(DISTINCT r.*) FILTER (WHERE r.id IS NOT NULL) as roles,
       json_agg(DISTINCT p.*) FILTER (WHERE p.id IS NOT NULL) as permissions
     FROM user_profiles up
     LEFT JOIN user_roles ur ON up.user_id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     LEFT JOIN permissions p ON rp.permission_id = p.id
     WHERE up.user_id = $1
     GROUP BY up.id`,
    [userId]
  );

  return result.rows[0] || null;
}

export async function deactivateUser(
  userId: string,
  requestingUserId: string
): Promise<void> {
  // Check permission
  const canManage = await canManageUsers(requestingUserId);
  if (!canManage) {
    throw new Error('Insufficient permissions to deactivate user');
  }

  // Cannot deactivate yourself
  if (userId === requestingUserId) {
    throw new Error('Cannot deactivate your own account');
  }

  await query(
    `UPDATE user_profiles
     SET is_active = false, updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
}

export async function activateUser(
  userId: string,
  requestingUserId: string
): Promise<void> {
  // Check permission
  const canManage = await canManageUsers(requestingUserId);
  if (!canManage) {
    throw new Error('Insufficient permissions to activate user');
  }

  await query(
    `UPDATE user_profiles
     SET is_active = true, updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
}

// ============================================================================
// PERMISSION CHECKING HELPERS
// ============================================================================

export interface PermissionCheck {
  resource: PermissionResource;
  action: PermissionAction;
}

export async function checkMultiplePermissions(
  userId: string,
  checks: PermissionCheck[]
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  for (const check of checks) {
    const permissionName = `${check.resource}:${check.action}`;
    const hasAccess = await hasPermission(userId, check.resource, check.action);
    results.set(permissionName, hasAccess);
  }

  return results;
}

export function requirePermission(
  userPermissions: UserPermissions | null,
  resource: PermissionResource,
  action: PermissionAction
): void {
  if (!userPermissions) {
    throw new Error('User permissions not loaded');
  }

  const permissionName = `${resource}:${action}`;
  if (!userPermissions.permissions.has(permissionName)) {
    throw new Error(`Insufficient permissions: ${permissionName}`);
  }
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

export async function getUserRoleLevel(userId: string): Promise<number | null> {
  const highestRole = await getUserHighestRole(userId);
  return highestRole?.level || null;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1
       AND r.name IN ('super_admin', 'company_owner')`,
    [userId]
  );

  return parseInt(result.rows[0].count) > 0;
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1
       AND r.name = 'super_admin'`,
    [userId]
  );

  return parseInt(result.rows[0].count) > 0;
}

// ============================================================================
// CROSS-COMPANY PERMISSIONS (Migration 005)
// ============================================================================

/**
 * 檢查使用者是否可以存取指定公司
 * 超級管理員可以存取所有公司，一般使用者只能存取所屬公司
 */
export async function canAccessCompany(
  userId: string,
  companyId: string
): Promise<boolean> {
  const result = await query(
    `SELECT can_access_company($1, $2) as can_access`,
    [userId, companyId]
  );

  return result.rows[0]?.can_access || false;
}

/**
 * 取得使用者可以管理的公司列表
 * 超級管理員可以看到所有公司，一般使用者只能看到所屬公司
 */
export interface ManageableCompany {
  company_id: string;
  company_name: {
    zh: string;
    en: string;
  };
  role_name: string;
  is_owner: boolean;
  can_manage_members: boolean;
  member_count: number;
}

export async function getManageableCompanies(
  userId: string
): Promise<ManageableCompany[]> {
  const result = await query(
    `SELECT * FROM get_manageable_companies($1)`,
    [userId]
  );

  return result.rows.map(row => ({
    company_id: row.company_id,
    company_name: row.company_name,
    role_name: row.role_name,
    is_owner: row.is_owner,
    can_manage_members: row.can_manage_members,
    member_count: parseInt(row.member_count) || 0
  }));
}

/**
 * 檢查是否可以管理指定使用者
 * 超級管理員可以管理任何人，公司 owner 可以管理自己公司的成員
 */
export async function canManageUser(
  requestingUserId: string,
  targetUserId: string,
  companyId?: string
): Promise<boolean> {
  // 不能管理自己
  if (requestingUserId === targetUserId) {
    return false;
  }

  const result = await query(
    `SELECT can_manage_user($1, $2, $3) as can_manage`,
    [requestingUserId, targetUserId, companyId || null]
  );

  return result.rows[0]?.can_manage || false;
}

/**
 * 檢查角色分配權限
 * 超級管理員可以分配任何角色，公司 owner 只能分配 level >= 3 的角色
 */
export async function canAssignRole(
  requestingUserId: string,
  targetRoleName: RoleName,
  companyId?: string
): Promise<boolean> {
  const result = await query(
    `SELECT can_assign_role($1, $2, $3) as can_assign`,
    [requestingUserId, targetRoleName, companyId || null]
  );

  return result.rows[0]?.can_assign || false;
}

/**
 * 取得所有公司（僅超級管理員）
 */
export interface CompanyInfo {
  id: string;
  name: {
    zh: string;
    en: string;
  };
  logo_url?: string;
  member_count: number;
  created_at: Date;
}

export async function getAllCompanies(
  requestingUserId: string
): Promise<CompanyInfo[]> {
  // 檢查是否為超級管理員
  const isSuperAdminUser = await isSuperAdmin(requestingUserId);
  if (!isSuperAdminUser) {
    throw new Error('Only super admin can view all companies');
  }

  const result = await query(
    `SELECT
      c.id,
      c.name,
      c.logo_url,
      c.created_at,
      (SELECT COUNT(*) FROM company_members WHERE company_id = c.id AND is_active = true) as member_count
    FROM companies c
    ORDER BY c.created_at DESC`
  );

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    logo_url: row.logo_url,
    member_count: parseInt(row.member_count) || 0,
    created_at: row.created_at
  }));
}
