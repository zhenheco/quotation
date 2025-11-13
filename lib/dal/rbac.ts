/**
 * RBAC (角色權限控制) 資料存取層
 */

import { D1Client } from '@/lib/db/d1-client'

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
  db: D1Client,
  userId: string
): Promise<Role[]> {
  const sql = `
    SELECT r.* FROM roles r
    INNER JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
  `

  return await db.query<Role>(sql, [userId])
}

export async function getUserPermissions(
  db: D1Client,
  userId: string
): Promise<Permission[]> {
  const sql = `
    SELECT DISTINCT p.* FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ?
  `

  return await db.query<Permission>(sql, [userId])
}

export async function hasPermission(
  db: D1Client,
  userId: string,
  permissionName: string
): Promise<boolean> {
  const sql = `
    SELECT COUNT(*) as count FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ? AND p.name = ?
  `

  const result = await db.queryOne<{ count: number }>(sql, [userId, permissionName])
  return result ? result.count > 0 : false
}

export async function assignRoleToUser(
  db: D1Client,
  userId: string,
  roleId: string,
  assignedBy?: string
): Promise<void> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO user_roles (id, user_id, role_id, assigned_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [id, userId, roleId, assignedBy || null, now, now]
  )
}

export async function isSuperAdmin(
  db: D1Client,
  userId: string
): Promise<boolean> {
  const sql = `
    SELECT COUNT(*) as count FROM user_roles ur
    INNER JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ? AND r.name = 'super_admin'
  `

  const result = await db.queryOne<{ count: number }>(sql, [userId])
  return result ? result.count > 0 : false
}

export async function getRoleByName(
  db: D1Client,
  roleName: string
): Promise<Role | null> {
  return await db.queryOne<Role>('SELECT * FROM roles WHERE name = ?', [roleName])
}

export async function canAssignRole(
  db: D1Client,
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

  const memberResult = await db.queryOne<{
    is_owner: number
    role_level: number
  }>(`
    SELECT cm.is_owner, r.level as role_level
    FROM company_members cm
    INNER JOIN roles r ON cm.role_id = r.id
    WHERE cm.company_id = ? AND cm.user_id = ? AND cm.is_active = 1
  `, [companyId, userId])

  if (!memberResult) {
    return false
  }

  const targetRole = await getRoleByName(db, targetRoleName)
  if (!targetRole) {
    return false
  }

  if (memberResult.is_owner === 1) {
    return memberResult.role_level < targetRole.level
  }

  return false
}
