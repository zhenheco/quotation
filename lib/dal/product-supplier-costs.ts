/**
 * 產品供應商成本資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

export interface ProductSupplierCost {
  id: string
  product_id: string
  supplier_id: string | null
  supplier_name: string
  supplier_code: string | null
  cost_price: number
  cost_currency: string
  is_preferred: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // 關聯的供應商資料（用於 JOIN 查詢）
  supplier?: {
    id: string
    name: { zh: string; en: string }
    code: string | null
  } | null
}

export async function getProductSupplierCosts(
  db: SupabaseClient,
  productId: string
): Promise<ProductSupplierCost[]> {
  const { data, error } = await db
    .from('product_supplier_costs')
    .select(`
      *,
      supplier:suppliers(id, name, code)
    `)
    .eq('product_id', productId)
    .order('is_preferred', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get product supplier costs: ${error.message}`)
  }

  return data || []
}

export async function getPreferredSupplierCost(
  db: SupabaseClient,
  productId: string
): Promise<ProductSupplierCost | null> {
  const { data, error } = await db
    .from('product_supplier_costs')
    .select('*')
    .eq('product_id', productId)
    .eq('is_preferred', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get preferred supplier cost: ${error.message}`)
  }

  return data
}

export async function createProductSupplierCost(
  db: SupabaseClient,
  data: {
    product_id: string
    supplier_id?: string
    supplier_name: string
    supplier_code?: string
    cost_price: number
    cost_currency: string
    is_preferred?: boolean
    notes?: string
  }
): Promise<ProductSupplierCost> {
  const now = new Date().toISOString()

  if (data.is_preferred) {
    await db
      .from('product_supplier_costs')
      .update({ is_preferred: false, updated_at: now })
      .eq('product_id', data.product_id)
      .eq('is_preferred', true)
  }

  const { data: supplierCost, error } = await db
    .from('product_supplier_costs')
    .insert({
      id: crypto.randomUUID(),
      product_id: data.product_id,
      supplier_id: data.supplier_id || null,
      supplier_name: data.supplier_name,
      supplier_code: data.supplier_code || null,
      cost_price: data.cost_price,
      cost_currency: data.cost_currency,
      is_preferred: data.is_preferred ?? false,
      notes: data.notes || null,
      created_at: now,
      updated_at: now
    })
    .select(`
      *,
      supplier:suppliers(id, name, code)
    `)
    .single()

  if (error) {
    throw new Error(`Failed to create product supplier cost: ${error.message}`)
  }

  if (data.is_preferred) {
    await syncPreferredSupplierToProduct(db, data.product_id, supplierCost)
  }

  return supplierCost
}

export async function updateProductSupplierCost(
  db: SupabaseClient,
  id: string,
  data: Partial<Omit<ProductSupplierCost, 'id' | 'product_id' | 'created_at' | 'updated_at' | 'supplier'>>
): Promise<ProductSupplierCost> {
  const now = new Date().toISOString()

  const { data: existing, error: fetchError } = await db
    .from('product_supplier_costs')
    .select('product_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    throw new Error(`Failed to find product supplier cost: ${fetchError.message}`)
  }

  if (data.is_preferred) {
    await db
      .from('product_supplier_costs')
      .update({ is_preferred: false, updated_at: now })
      .eq('product_id', existing.product_id)
      .neq('id', id)
  }

  const { data: supplierCost, error } = await db
    .from('product_supplier_costs')
    .update({
      ...data,
      updated_at: now
    })
    .eq('id', id)
    .select(`
      *,
      supplier:suppliers(id, name, code)
    `)
    .single()

  if (error) {
    throw new Error(`Failed to update product supplier cost: ${error.message}`)
  }

  if (data.is_preferred) {
    await syncPreferredSupplierToProduct(db, existing.product_id, supplierCost)
  }

  return supplierCost
}

export async function deleteProductSupplierCost(
  db: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await db
    .from('product_supplier_costs')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete product supplier cost: ${error.message}`)
  }
}

export async function setPreferredSupplier(
  db: SupabaseClient,
  productId: string,
  supplierCostId: string
): Promise<void> {
  const now = new Date().toISOString()

  await db
    .from('product_supplier_costs')
    .update({ is_preferred: false, updated_at: now })
    .eq('product_id', productId)

  const { data: supplierCost, error } = await db
    .from('product_supplier_costs')
    .update({ is_preferred: true, updated_at: now })
    .eq('id', supplierCostId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to set preferred supplier: ${error.message}`)
  }

  await syncPreferredSupplierToProduct(db, productId, supplierCost)
}

async function syncPreferredSupplierToProduct(
  db: SupabaseClient,
  productId: string,
  supplierCost: ProductSupplierCost
): Promise<void> {
  const now = new Date().toISOString()

  await db
    .from('products')
    .update({
      supplier: supplierCost.supplier_name,
      supplier_code: supplierCost.supplier_code,
      cost_price: supplierCost.cost_price,
      cost_currency: supplierCost.cost_currency,
      updated_at: now
    })
    .eq('id', productId)
}
