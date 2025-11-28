/**
 * RBAC (角色權限控制) 資料存取層
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

export interface Role {
  id: string
  name: string
  name_zh: string
  name_en: string
  level: number
  description: string | null
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  resource: string
  action: string
  name: string
  description: string | null
  created_at: string
}

export async function getUserRoles(
  db: SupabaseClient,
  userId: string
): Promise<Role[]> {
  const { data, error } = await db
    .from('user_roles')
    .select(`
      roles (*)
    `)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to get user roles: ${error.message}`)
  }

  return (data || []).map(row => row.roles as unknown as Role).filter(Boolean)
}

export async function getUserPermissions(
  db: SupabaseClient,
  userId: string
): Promise<Permission[]> {
  const { data, error } = await db
    .from('user_roles')
    .select(`
      roles (
        role_permissions (
          permissions (*)
        )
      )
    `)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to get user permissions: ${error.message}`)
  }

  const permissions: Permission[] = []
  const seenIds = new Set<string>()

  for (const row of data || []) {
    const rolesRaw = row.roles as unknown
    const roles = rolesRaw as { role_permissions: Array<{ permissions: Permission }> } | null
    if (!roles?.role_permissions) continue

    for (const rp of roles.role_permissions) {
      if (rp.permissions && !seenIds.has(rp.permissions.id)) {
        seenIds.add(rp.permissions.id)
        permissions.push(rp.permissions)
      }
    }
  }

  return permissions
}

export async function hasPermission(
  db: SupabaseClient,
  userId: string,
  permissionName: string
): Promise<boolean> {
  const permissions = await getUserPermissions(db, userId)
  return permissions.some(p => p.name === permissionName)
}

export async function assignRoleToUser(
  db: SupabaseClient,
  userId: string,
  roleId: string,
  assignedBy?: string
): Promise<void> {
  const now = new Date().toISOString()

  const { error } = await db
    .from('user_roles')
    .upsert({
      id: crypto.randomUUID(),
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy || null,
      created_at: now,
      updated_at: now,
    }, {
      onConflict: 'user_id,role_id',
      ignoreDuplicates: true,
    })

  if (error) {
    throw new Error(`Failed to assign role: ${error.message}`)
  }
}

export async function isSuperAdmin(
  db: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await db
    .from('user_roles')
    .select(`
      roles!inner (name)
    `)
    .eq('user_id', userId)
    .eq('roles.name', 'super_admin')

  if (error) {
    throw new Error(`Failed to check super admin: ${error.message}`)
  }

  return (data || []).length > 0
}

export async function getRoleByName(
  db: SupabaseClient,
  roleName: string
): Promise<Role | null> {
  const { data, error } = await db
    .from('roles')
    .select('*')
    .eq('name', roleName)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get role: ${error.message}`)
  }

  return data
}

/**
 * 確保使用者至少有一個角色
 * 如果沒有角色，為第一個使用者分配 super_admin，其他使用者分配 company_owner
 */
export async function ensureUserHasRole(
  db: SupabaseClient,
  userId: string
): Promise<boolean> {
  const existingRoles = await getUserRoles(db, userId)
  if (existingRoles.length > 0) {
    return false
  }

  const { count, error: countError } = await db
    .from('user_roles')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    throw new Error(`Failed to count user roles: ${countError.message}`)
  }

  const isFirstUser = !count || count === 0
  const roleToAssign = isFirstUser ? 'super_admin' : 'company_owner'

  const role = await getRoleByName(db, roleToAssign)
  if (!role) {
    console.error(`[RBAC] Role ${roleToAssign} not found in database`)
    return false
  }

  await assignRoleToUser(db, userId, role.id)
  console.log(`[RBAC] Assigned ${roleToAssign} role to user ${userId}`)
  return true
}

export async function canAssignRole(
  db: SupabaseClient,
  userId: string,
  targetRoleName: string,
  companyId?: string
): Promise<boolean> {
  const isSuper = await isSuperAdmin(db, userId)
  if (isSuper) {
    return true
  }

  if (!companyId) {
    return false
  }

  const { data: memberResult, error: memberError } = await db
    .from('company_members')
    .select(`
      is_owner,
      roles (level)
    `)
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (memberError && memberError.code !== 'PGRST116') {
    throw new Error(`Failed to get member info: ${memberError.message}`)
  }

  if (!memberResult) {
    return false
  }

  const targetRole = await getRoleByName(db, targetRoleName)
  if (!targetRole) {
    return false
  }

  const rolesData = memberResult.roles as unknown
  const roleLevel = (rolesData as { level: number } | null)?.level || 0

  if (memberResult.is_owner) {
    return roleLevel < targetRole.level
  }

  return false
}
