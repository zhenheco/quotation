/**
 * POS 租戶與分店資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export type TenantPlan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export type StaffRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'TECHNICIAN'

export interface Tenant {
  id: string
  name: string
  slug: string
  display_name: string | null
  logo: string | null
  description: string | null
  plan: TenantPlan
  plan_expiry_at: string | null
  max_branches: number
  max_staff_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface UserTenant {
  id: string
  user_id: string
  tenant_id: string
  role: StaffRole
  branch_id: string | null
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  tenant_id: string
  name: string
  code: string
  display_name: string | null
  phone: string | null
  address: string | null
  open_time: string
  close_time: string
  company_id: string | null
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateTenantInput {
  name: string
  slug: string
  display_name?: string
  logo?: string
  description?: string
  plan?: TenantPlan
  max_branches?: number
  max_staff_count?: number
}

export interface UpdateTenantInput {
  name?: string
  display_name?: string
  logo?: string
  description?: string
  plan?: TenantPlan
  plan_expiry_at?: string
  max_branches?: number
  max_staff_count?: number
  is_active?: boolean
}

export interface CreateBranchInput {
  tenant_id: string
  name: string
  code: string
  display_name?: string
  phone?: string
  address?: string
  open_time?: string
  close_time?: string
  company_id?: string
  is_default?: boolean
}

export interface UpdateBranchInput {
  name?: string
  display_name?: string
  phone?: string
  address?: string
  open_time?: string
  close_time?: string
  company_id?: string
  is_active?: boolean
  is_default?: boolean
}

// ============================================
// 租戶查詢函數
// ============================================

/**
 * 取得使用者可存取的租戶列表
 */
export async function getUserTenants(
  db: SupabaseClient,
  userId: string
): Promise<(UserTenant & { tenant: Tenant })[]> {
  const { data, error } = await db
    .from('user_tenants')
    .select(`
      *,
      tenant:tenants(*)
    `)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`取得使用者租戶失敗: ${error.message}`)
  }

  return (data || []).filter((ut) => ut.tenant && !ut.tenant.deleted_at)
}

/**
 * 根據 ID 取得租戶
 */
export async function getTenantById(
  db: SupabaseClient,
  tenantId: string
): Promise<Tenant | null> {
  const { data, error } = await db
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得租戶失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據 Slug 取得租戶
 */
export async function getTenantBySlug(
  db: SupabaseClient,
  slug: string
): Promise<Tenant | null> {
  const { data, error } = await db
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得租戶失敗: ${error.message}`)
  }

  return data
}

/**
 * 檢查使用者是否有租戶存取權
 */
export async function checkUserTenantAccess(
  db: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<UserTenant | null> {
  const { data, error } = await db
    .from('user_tenants')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    throw new Error(`檢查租戶存取權失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得租戶使用者列表
 */
export async function getTenantUsers(
  db: SupabaseClient,
  tenantId: string
): Promise<UserTenant[]> {
  const { data, error } = await db
    .from('user_tenants')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`取得租戶使用者失敗: ${error.message}`)
  }

  return data || []
}

// ============================================
// 分店查詢函數
// ============================================

/**
 * 取得租戶的分店列表
 */
export async function getBranches(
  db: SupabaseClient,
  tenantId: string,
  isActive?: boolean
): Promise<Branch[]> {
  let query = db
    .from('branches')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得分店列表失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得分店
 */
export async function getBranchById(
  db: SupabaseClient,
  branchId: string
): Promise<Branch | null> {
  const { data, error } = await db
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得分店失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得預設分店
 */
export async function getDefaultBranch(
  db: SupabaseClient,
  tenantId: string
): Promise<Branch | null> {
  const { data, error } = await db
    .from('branches')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_default', true)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得預設分店失敗: ${error.message}`)
  }

  return data
}

// ============================================
// 租戶寫入函數
// ============================================

/**
 * 建立租戶
 */
export async function createTenant(
  db: SupabaseClient,
  input: CreateTenantInput,
  ownerId: string
): Promise<Tenant> {
  // 檢查 slug 是否重複
  const existing = await getTenantBySlug(db, input.slug)
  if (existing) {
    throw new Error(`Slug ${input.slug} 已被使用`)
  }

  const tenantId = crypto.randomUUID()

  // 建立租戶
  const { data: tenant, error: tenantError } = await db
    .from('tenants')
    .insert({
      id: tenantId,
      name: input.name,
      slug: input.slug,
      display_name: input.display_name || input.name,
      logo: input.logo || null,
      description: input.description || null,
      plan: input.plan || 'STARTER',
      max_branches: input.max_branches || 1,
      max_staff_count: input.max_staff_count || 5,
      is_active: true,
    })
    .select()
    .single()

  if (tenantError) {
    throw new Error(`建立租戶失敗: ${tenantError.message}`)
  }

  // 建立 Owner 關聯
  const { error: utError } = await db.from('user_tenants').insert({
    id: crypto.randomUUID(),
    user_id: ownerId,
    tenant_id: tenantId,
    role: 'OWNER',
  })

  if (utError) {
    // 嘗試回滾
    await db.from('tenants').delete().eq('id', tenantId)
    throw new Error(`建立租戶擁有者關聯失敗: ${utError.message}`)
  }

  return tenant
}

/**
 * 更新租戶
 */
export async function updateTenant(
  db: SupabaseClient,
  tenantId: string,
  input: UpdateTenantInput
): Promise<Tenant> {
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.display_name !== undefined) updateData.display_name = input.display_name
  if (input.logo !== undefined) updateData.logo = input.logo
  if (input.description !== undefined) updateData.description = input.description
  if (input.plan !== undefined) updateData.plan = input.plan
  if (input.plan_expiry_at !== undefined) updateData.plan_expiry_at = input.plan_expiry_at
  if (input.max_branches !== undefined) updateData.max_branches = input.max_branches
  if (input.max_staff_count !== undefined) updateData.max_staff_count = input.max_staff_count
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await db
    .from('tenants')
    .update(updateData)
    .eq('id', tenantId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    throw new Error(`更新租戶失敗: ${error.message}`)
  }

  return data
}

/**
 * 新增租戶使用者
 */
export async function addUserToTenant(
  db: SupabaseClient,
  tenantId: string,
  userId: string,
  role: StaffRole,
  branchId?: string
): Promise<UserTenant> {
  const { data, error } = await db
    .from('user_tenants')
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      tenant_id: tenantId,
      role,
      branch_id: branchId || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('使用者已在此租戶中')
    }
    throw new Error(`新增租戶使用者失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新租戶使用者角色
 */
export async function updateUserTenantRole(
  db: SupabaseClient,
  userTenantId: string,
  role: StaffRole,
  branchId?: string
): Promise<UserTenant> {
  const { data, error } = await db
    .from('user_tenants')
    .update({
      role,
      branch_id: branchId,
    })
    .eq('id', userTenantId)
    .select()
    .single()

  if (error) {
    throw new Error(`更新使用者角色失敗: ${error.message}`)
  }

  return data
}

/**
 * 移除租戶使用者
 */
export async function removeUserFromTenant(
  db: SupabaseClient,
  userTenantId: string
): Promise<void> {
  const { error } = await db.from('user_tenants').delete().eq('id', userTenantId)

  if (error) {
    throw new Error(`移除租戶使用者失敗: ${error.message}`)
  }
}

// ============================================
// 分店寫入函數
// ============================================

/**
 * 建立分店
 */
export async function createBranch(
  db: SupabaseClient,
  input: CreateBranchInput
): Promise<Branch> {
  // 檢查租戶分店數量限制
  const tenant = await getTenantById(db, input.tenant_id)
  if (!tenant) {
    throw new Error('租戶不存在')
  }

  const branches = await getBranches(db, input.tenant_id)
  if (branches.length >= tenant.max_branches) {
    throw new Error(`已達分店數量上限 (${tenant.max_branches})`)
  }

  // 如果設為預設，先取消其他預設
  if (input.is_default) {
    await db
      .from('branches')
      .update({ is_default: false })
      .eq('tenant_id', input.tenant_id)
      .eq('is_default', true)
  }

  // 如果是第一家分店，自動設為預設
  const isFirstBranch = branches.length === 0

  const { data, error } = await db
    .from('branches')
    .insert({
      id: crypto.randomUUID(),
      tenant_id: input.tenant_id,
      name: input.name,
      code: input.code,
      display_name: input.display_name || input.name,
      phone: input.phone || null,
      address: input.address || null,
      open_time: input.open_time || '09:00',
      close_time: input.close_time || '21:00',
      company_id: input.company_id || null,
      is_active: true,
      is_default: input.is_default || isFirstBranch,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`分店代碼 ${input.code} 已存在`)
    }
    throw new Error(`建立分店失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新分店
 */
export async function updateBranch(
  db: SupabaseClient,
  branchId: string,
  input: UpdateBranchInput
): Promise<Branch> {
  const existing = await getBranchById(db, branchId)
  if (!existing) {
    throw new Error('分店不存在')
  }

  // 如果設為預設，先取消其他預設
  if (input.is_default) {
    await db
      .from('branches')
      .update({ is_default: false })
      .eq('tenant_id', existing.tenant_id)
      .eq('is_default', true)
      .neq('id', branchId)
  }

  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.display_name !== undefined) updateData.display_name = input.display_name
  if (input.phone !== undefined) updateData.phone = input.phone
  if (input.address !== undefined) updateData.address = input.address
  if (input.open_time !== undefined) updateData.open_time = input.open_time
  if (input.close_time !== undefined) updateData.close_time = input.close_time
  if (input.company_id !== undefined) updateData.company_id = input.company_id
  if (input.is_active !== undefined) updateData.is_active = input.is_active
  if (input.is_default !== undefined) updateData.is_default = input.is_default

  const { data, error } = await db
    .from('branches')
    .update(updateData)
    .eq('id', branchId)
    .select()
    .single()

  if (error) {
    throw new Error(`更新分店失敗: ${error.message}`)
  }

  return data
}

/**
 * 刪除分店（軟刪除）
 */
export async function deleteBranch(db: SupabaseClient, branchId: string): Promise<void> {
  const { error } = await db
    .from('branches')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', branchId)

  if (error) {
    throw new Error(`刪除分店失敗: ${error.message}`)
  }
}
