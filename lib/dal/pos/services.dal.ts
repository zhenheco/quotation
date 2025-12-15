/**
 * POS 服務項目資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export interface ServiceCategory {
  id: string
  tenant_id: string
  name: string
  code: string
  description: string | null
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PosService {
  id: string
  tenant_id: string
  name: string
  code: string
  description: string | null
  category_id: string
  price: number
  duration_mins: number
  account_code: string | null
  tax_code_id: string | null
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ServicePackage {
  id: string
  tenant_id: string
  name: string
  code: string
  description: string | null
  price: number
  original_price: number
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ServicePackageService {
  id: string
  package_id: string
  service_id: string
  quantity: number
}

export interface PosServiceWithCategory extends PosService {
  category: ServiceCategory | null
}

export interface ServicePackageWithServices extends ServicePackage {
  services: (ServicePackageService & { service: PosService })[]
}

export interface CreateServiceCategoryInput {
  tenant_id: string
  name: string
  code: string
  description?: string
  icon?: string
  color?: string
  sort_order?: number
}

export interface CreateServiceInput {
  tenant_id: string
  name: string
  code: string
  description?: string
  category_id: string
  price: number
  duration_mins: number
  account_code?: string
  tax_code_id?: string
  icon?: string
  color?: string
  sort_order?: number
}

export interface UpdateServiceInput {
  name?: string
  description?: string
  category_id?: string
  price?: number
  duration_mins?: number
  account_code?: string
  tax_code_id?: string
  icon?: string
  color?: string
  sort_order?: number
  is_active?: boolean
}

export interface CreatePackageInput {
  tenant_id: string
  name: string
  code: string
  description?: string
  price: number
  original_price: number
  icon?: string
  color?: string
  sort_order?: number
  services: { service_id: string; quantity: number }[]
}

// ============================================
// 服務類別查詢函數
// ============================================

/**
 * 取得服務類別列表
 */
export async function getServiceCategories(
  db: SupabaseClient,
  tenantId: string,
  isActive?: boolean
): Promise<ServiceCategory[]> {
  let query = db
    .from('service_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得服務類別失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得服務類別
 */
export async function getServiceCategoryById(
  db: SupabaseClient,
  categoryId: string
): Promise<ServiceCategory | null> {
  const { data, error } = await db
    .from('service_categories')
    .select('*')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得服務類別失敗: ${error.message}`)
  }

  return data
}

// ============================================
// 服務項目查詢函數
// ============================================

/**
 * 取得服務項目列表
 */
export async function getServices(
  db: SupabaseClient,
  tenantId: string,
  options: { categoryId?: string; isActive?: boolean } = {}
): Promise<PosServiceWithCategory[]> {
  const { categoryId, isActive = true } = options

  let query = db
    .from('pos_services')
    .select(`
      *,
      category:service_categories(*)
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得服務項目失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得服務項目
 */
export async function getServiceById(
  db: SupabaseClient,
  serviceId: string
): Promise<PosServiceWithCategory | null> {
  const { data, error } = await db
    .from('pos_services')
    .select(`
      *,
      category:service_categories(*)
    `)
    .eq('id', serviceId)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得服務項目失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據代碼取得服務項目
 */
export async function getServiceByCode(
  db: SupabaseClient,
  tenantId: string,
  code: string
): Promise<PosService | null> {
  const { data, error } = await db
    .from('pos_services')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('code', code)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得服務項目失敗: ${error.message}`)
  }

  return data
}

// ============================================
// 服務套餐查詢函數
// ============================================

/**
 * 取得服務套餐列表
 */
export async function getServicePackages(
  db: SupabaseClient,
  tenantId: string,
  isActive?: boolean
): Promise<ServicePackage[]> {
  let query = db
    .from('service_packages')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得服務套餐失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得服務套餐（含服務明細）
 */
export async function getServicePackageById(
  db: SupabaseClient,
  packageId: string
): Promise<ServicePackageWithServices | null> {
  const { data: pkg, error: pkgError } = await db
    .from('service_packages')
    .select('*')
    .eq('id', packageId)
    .is('deleted_at', null)
    .single()

  if (pkgError && pkgError.code !== 'PGRST116') {
    throw new Error(`取得服務套餐失敗: ${pkgError.message}`)
  }

  if (!pkg) return null

  // 取得套餐服務
  const { data: services, error: servicesError } = await db
    .from('service_package_services')
    .select(`
      *,
      service:pos_services(*)
    `)
    .eq('package_id', packageId)

  if (servicesError) {
    throw new Error(`取得套餐服務失敗: ${servicesError.message}`)
  }

  return {
    ...pkg,
    services: services || [],
  }
}

// ============================================
// 服務類別寫入函數
// ============================================

/**
 * 建立服務類別
 */
export async function createServiceCategory(
  db: SupabaseClient,
  input: CreateServiceCategoryInput
): Promise<ServiceCategory> {
  const { data, error } = await db
    .from('service_categories')
    .insert({
      id: crypto.randomUUID(),
      tenant_id: input.tenant_id,
      name: input.name,
      code: input.code,
      description: input.description || null,
      icon: input.icon || null,
      color: input.color || null,
      sort_order: input.sort_order || 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`類別代碼 ${input.code} 已存在`)
    }
    throw new Error(`建立服務類別失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新服務類別
 */
export async function updateServiceCategory(
  db: SupabaseClient,
  categoryId: string,
  input: Partial<CreateServiceCategoryInput>
): Promise<ServiceCategory> {
  const { data, error } = await db
    .from('service_categories')
    .update(input)
    .eq('id', categoryId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    throw new Error(`更新服務類別失敗: ${error.message}`)
  }

  return data
}

/**
 * 刪除服務類別（軟刪除）
 */
export async function deleteServiceCategory(
  db: SupabaseClient,
  categoryId: string
): Promise<void> {
  const { error } = await db
    .from('service_categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', categoryId)

  if (error) {
    throw new Error(`刪除服務類別失敗: ${error.message}`)
  }
}

// ============================================
// 服務項目寫入函數
// ============================================

/**
 * 建立服務項目
 */
export async function createService(
  db: SupabaseClient,
  input: CreateServiceInput
): Promise<PosService> {
  const { data, error } = await db
    .from('pos_services')
    .insert({
      id: crypto.randomUUID(),
      tenant_id: input.tenant_id,
      name: input.name,
      code: input.code,
      description: input.description || null,
      category_id: input.category_id,
      price: input.price,
      duration_mins: input.duration_mins,
      account_code: input.account_code || null,
      tax_code_id: input.tax_code_id || null,
      icon: input.icon || null,
      color: input.color || null,
      sort_order: input.sort_order || 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`服務代碼 ${input.code} 已存在`)
    }
    throw new Error(`建立服務項目失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新服務項目
 */
export async function updateService(
  db: SupabaseClient,
  serviceId: string,
  input: UpdateServiceInput
): Promise<PosService> {
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.category_id !== undefined) updateData.category_id = input.category_id
  if (input.price !== undefined) updateData.price = input.price
  if (input.duration_mins !== undefined) updateData.duration_mins = input.duration_mins
  if (input.account_code !== undefined) updateData.account_code = input.account_code
  if (input.tax_code_id !== undefined) updateData.tax_code_id = input.tax_code_id
  if (input.icon !== undefined) updateData.icon = input.icon
  if (input.color !== undefined) updateData.color = input.color
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await db
    .from('pos_services')
    .update(updateData)
    .eq('id', serviceId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    throw new Error(`更新服務項目失敗: ${error.message}`)
  }

  return data
}

/**
 * 刪除服務項目（軟刪除）
 */
export async function deleteService(db: SupabaseClient, serviceId: string): Promise<void> {
  const { error } = await db
    .from('pos_services')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', serviceId)

  if (error) {
    throw new Error(`刪除服務項目失敗: ${error.message}`)
  }
}

// ============================================
// 服務套餐寫入函數
// ============================================

/**
 * 建立服務套餐
 */
export async function createServicePackage(
  db: SupabaseClient,
  input: CreatePackageInput
): Promise<ServicePackage> {
  const packageId = crypto.randomUUID()

  // 建立套餐
  const { data: pkg, error: pkgError } = await db
    .from('service_packages')
    .insert({
      id: packageId,
      tenant_id: input.tenant_id,
      name: input.name,
      code: input.code,
      description: input.description || null,
      price: input.price,
      original_price: input.original_price,
      icon: input.icon || null,
      color: input.color || null,
      sort_order: input.sort_order || 0,
      is_active: true,
    })
    .select()
    .single()

  if (pkgError) {
    if (pkgError.code === '23505') {
      throw new Error(`套餐代碼 ${input.code} 已存在`)
    }
    throw new Error(`建立服務套餐失敗: ${pkgError.message}`)
  }

  // 建立套餐服務關聯
  if (input.services.length > 0) {
    const serviceLinks = input.services.map((s) => ({
      id: crypto.randomUUID(),
      package_id: packageId,
      service_id: s.service_id,
      quantity: s.quantity,
    }))

    const { error: linkError } = await db.from('service_package_services').insert(serviceLinks)

    if (linkError) {
      // 嘗試回滾
      await db.from('service_packages').delete().eq('id', packageId)
      throw new Error(`建立套餐服務關聯失敗: ${linkError.message}`)
    }
  }

  return pkg
}

/**
 * 更新服務套餐
 */
export async function updateServicePackage(
  db: SupabaseClient,
  packageId: string,
  input: Partial<CreatePackageInput>
): Promise<ServicePackage> {
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.price !== undefined) updateData.price = input.price
  if (input.original_price !== undefined) updateData.original_price = input.original_price
  if (input.icon !== undefined) updateData.icon = input.icon
  if (input.color !== undefined) updateData.color = input.color
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order

  const { data, error } = await db
    .from('service_packages')
    .update(updateData)
    .eq('id', packageId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    throw new Error(`更新服務套餐失敗: ${error.message}`)
  }

  // 更新套餐服務關聯
  if (input.services !== undefined) {
    // 刪除現有關聯
    await db.from('service_package_services').delete().eq('package_id', packageId)

    // 建立新關聯
    if (input.services.length > 0) {
      const serviceLinks = input.services.map((s) => ({
        id: crypto.randomUUID(),
        package_id: packageId,
        service_id: s.service_id,
        quantity: s.quantity,
      }))

      const { error: linkError } = await db.from('service_package_services').insert(serviceLinks)

      if (linkError) {
        throw new Error(`更新套餐服務關聯失敗: ${linkError.message}`)
      }
    }
  }

  return data
}

/**
 * 刪除服務套餐（軟刪除）
 */
export async function deleteServicePackage(
  db: SupabaseClient,
  packageId: string
): Promise<void> {
  const { error } = await db
    .from('service_packages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', packageId)

  if (error) {
    throw new Error(`刪除服務套餐失敗: ${error.message}`)
  }
}
