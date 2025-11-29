/**
 * 產品資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

export interface Product {
  id: string
  user_id: string
  company_id: string | null
  sku: string | null
  name: { zh: string; en: string }
  description: { zh: string; en: string } | null
  unit_price: number
  currency: string
  base_price: number
  base_currency: string
  category: string | null
  cost_price: number | null
  cost_currency: string | null
  profit_margin: number | null
  supplier: string | null
  supplier_code: string | null
  unit: string | null
  is_active: boolean | null
  created_at: string
  updated_at: string
}

function mapProductWithAliases(product: Omit<Product, 'base_price' | 'base_currency'>): Product {
  return {
    ...product,
    base_price: product.unit_price,
    base_currency: product.currency,
  }
}

export async function getProducts(
  db: SupabaseClient,
  userId: string,
  companyId?: string
): Promise<Product[]> {
  let query = db
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get products: ${error.message}`)
  }

  return (data || []).map(mapProductWithAliases)
}

export async function getProductById(
  db: SupabaseClient,
  userId: string,
  productId: string
): Promise<Product | null> {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get product: ${error.message}`)
  }

  return data ? mapProductWithAliases(data) : null
}

export async function createProduct(
  db: SupabaseClient,
  userId: string,
  data: {
    id?: string
    company_id?: string
    sku?: string
    name: { zh: string; en: string }
    description?: { zh: string; en: string }
    unit_price: number
    currency: string
    category?: string
    cost_price?: number
    cost_currency?: string
    profit_margin?: number
    supplier?: string
    supplier_code?: string
    unit?: string
    is_active?: boolean
  }
): Promise<Product> {
  const now = new Date().toISOString()

  const { data: product, error } = await db
    .from('products')
    .insert({
      id: data.id || crypto.randomUUID(),
      user_id: userId,
      company_id: data.company_id || null,
      sku: data.sku || null,
      name: data.name,
      description: data.description || null,
      unit_price: data.unit_price,
      currency: data.currency,
      category: data.category || null,
      cost_price: data.cost_price || null,
      cost_currency: data.cost_currency || null,
      profit_margin: data.profit_margin || null,
      supplier: data.supplier || null,
      supplier_code: data.supplier_code || null,
      unit: data.unit || null,
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`)
  }

  return mapProductWithAliases(product)
}

export async function updateProduct(
  db: SupabaseClient,
  userId: string,
  productId: string,
  data: Partial<Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Product> {
  const { data: product, error } = await db
    .from('products')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', productId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`)
  }

  return mapProductWithAliases(product)
}

export async function deleteProduct(
  db: SupabaseClient,
  userId: string,
  productId: string
): Promise<void> {
  const { error, count } = await db
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete product: ${error.message}`)
  }

  if (count === 0) {
    throw new Error('Product not found or already deleted')
  }
}

export async function searchProducts(
  db: SupabaseClient,
  userId: string,
  query: string,
  companyId?: string
): Promise<Product[]> {
  let dbQuery = db
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .or(`sku.ilike.%${query}%,name.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (companyId) {
    dbQuery = dbQuery.eq('company_id', companyId)
  }

  const { data, error } = await dbQuery

  if (error) {
    throw new Error(`Failed to search products: ${error.message}`)
  }

  return (data || []).map(mapProductWithAliases)
}
