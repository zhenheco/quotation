/**
 * Role-Based Access Control (RBAC) Service
 * Handles user roles, permissions, and access control
 */

import { createClient } from '@/lib/supabase/server';
import type {
  Role,
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as UserProfile;
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
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      full_name: data.full_name || null,
      display_name: data.display_name || null,
      phone: data.phone || null,
      department: data.department || null,
      avatar_url: data.avatar_url || null,
    })
    .select()
    .single();

  if (error) throw error;

  return profile as UserProfile;
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
  if (Object.keys(data).length === 0) {
    throw new Error('No fields to update');
  }

  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('user_profiles')
    .update(data)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  if (!updated) throw new Error('User profile not found');

  return updated as UserProfile;
}

export async function updateLastLogin(userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================================================
// ROLES
// ============================================================================

export async function getAllRoles(): Promise<Role[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('level', { ascending: true });

  if (error) throw error;

  return (data || []) as Role[];
}

export async function getRoleByName(name: RoleName): Promise<Role | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', name)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as Role;
}

// ============================================================================
// USER ROLES
// ============================================================================

export async function getUserRoles(userId: string): Promise<Role[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      roles!inner(*)
    `)
    .eq('user_id', userId)
    .order('roles(level)', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => row.roles) as unknown as Role[];
}

export async function assignRoleToUser(
  userId: string,
  roleName: RoleName,
  assignedBy: string
): Promise<UserRole> {
  const role = await getRoleByName(roleName);
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  const supabase = await createClient();

  const { data: existing, error: checkError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
    .eq('role_id', role.id)
    .single();

  if (!checkError && existing) {
    return existing as UserRole;
  }

  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: role.id,
      assigned_by: assignedBy,
    })
    .select()
    .single();

  if (error) throw error;

  return data as UserRole;
}

export async function removeRoleFromUser(
  userId: string,
  roleName: RoleName
): Promise<void> {
  const role = await getRoleByName(roleName);
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', role.id);

  if (error) throw error;
}

export async function getUserHighestRole(userId: string): Promise<Role | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      roles!inner(*)
    `)
    .eq('user_id', userId)
    .order('roles(level)', { ascending: true })
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  return data[0].roles as unknown as Role;
}

// ============================================================================
// PERMISSIONS
// ============================================================================

export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const permissions = new Set<string>(
    data.map((row) => row.permission_name as string)
  );

  return {
    user_id: userId,
    role_name: data[0].role_name as RoleName,
    role_level: data[0].role_level as number,
    permissions,
  };
}

export async function hasPermission(
  userId: string,
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  const actionMapping: Record<PermissionAction, string> = {
    read: 'view',
    write: 'edit',
    delete: 'delete',
    read_cost: 'view_cost',
    write_cost: 'edit_cost',
    assign_roles: 'assign_roles',
  };

  const actionVerb = actionMapping[action] || action;
  const permissionName = `${actionVerb}_${resource}`;

  const supabase = await createClient();

  const { count, error } = await supabase
    .from('user_permissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('permission_name', permissionName);

  if (error) {
    throw error;
  }

  return (count || 0) > 0;
}

export async function canAccessProductCost(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('user_roles')
    .select(`
      roles!inner(name)
    `, { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('roles.name', ['super_admin', 'company_owner', 'accountant']);

  if (error) throw error;

  return (count || 0) > 0;
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
  const canView = await hasPermission(requestingUserId, 'users', 'read');
  if (!canView) {
    throw new Error('Insufficient permissions to view users');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      user_roles(
        roles(*)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(profile => {
    const userRoles = profile.user_roles as { roles: Role }[];
    const roles = userRoles?.map(ur => ur.roles) || [];

    return {
      ...profile,
      roles,
      permissions: [],
    } as UserWithRole;
  });
}

export async function getUserById(
  userId: string,
  requestingUserId: string
): Promise<UserWithRole | null> {
  const canView = await hasPermission(requestingUserId, 'users', 'read');
  if (!canView && userId !== requestingUserId) {
    throw new Error('Insufficient permissions to view user');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      user_roles(
        roles(*)
      )
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;

  const userRoles = data.user_roles as { roles: Role }[];
  const roles = userRoles?.map(ur => ur.roles) || [];

  return {
    ...data,
    roles,
    permissions: [],
  } as UserWithRole;
}

export async function deactivateUser(
  userId: string,
  requestingUserId: string
): Promise<void> {
  const canManage = await canManageUsers(requestingUserId);
  if (!canManage) {
    throw new Error('Insufficient permissions to deactivate user');
  }

  if (userId === requestingUserId) {
    throw new Error('Cannot deactivate your own account');
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function activateUser(
  userId: string,
  requestingUserId: string
): Promise<void> {
  const canManage = await canManageUsers(requestingUserId);
  if (!canManage) {
    throw new Error('Insufficient permissions to activate user');
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: true })
    .eq('user_id', userId);

  if (error) throw error;
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
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('user_roles')
    .select(`
      roles!inner(name)
    `, { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('roles.name', ['super_admin', 'company_owner']);

  if (error) throw error;

  return (count || 0) > 0;
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('user_roles')
    .select(`
      roles!inner(name)
    `, { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('roles.name', 'super_admin');

  if (error) throw error;

  return (count || 0) > 0;
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('can_access_company', {
      p_user_id: userId,
      p_company_id: companyId,
    });

  if (error) throw error;

  return data || false;
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('get_manageable_companies', {
      p_user_id: userId,
    });

  if (error) throw error;

  return (data || []).map(row => ({
    company_id: row.company_id,
    company_name: row.company_name,
    role_name: row.role_name,
    is_owner: row.is_owner,
    can_manage_members: row.can_manage_members,
    member_count: parseInt(row.member_count) || 0,
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
  if (requestingUserId === targetUserId) {
    return false;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('can_manage_user', {
      p_requesting_user_id: requestingUserId,
      p_target_user_id: targetUserId,
      p_company_id: companyId || null,
    });

  if (error) throw error;

  return data || false;
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('can_assign_role', {
      p_requesting_user_id: requestingUserId,
      p_target_role_name: targetRoleName,
      p_company_id: companyId || null,
    });

  if (error) throw error;

  return data || false;
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
  const isSuperAdminUser = await isSuperAdmin(requestingUserId);
  if (!isSuperAdminUser) {
    throw new Error('Only super admin can view all companies');
  }

  const supabase = await createClient();

  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (companiesError) throw companiesError;

  const companiesWithCounts = await Promise.all(
    (companies || []).map(async (company) => {
      const { count } = await supabase
        .from('company_members')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('is_active', true);

      return {
        id: company.id,
        name: company.name as { zh: string; en: string },
        logo_url: company.logo_url || undefined,
        member_count: count || 0,
        created_at: new Date(company.created_at),
      };
    })
  );

  return companiesWithCounts;
}
