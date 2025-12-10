/**
 * 產品資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import { withRetry, RetryOptions } from '@/lib/utils/retry'

export interface Product {
  id: string
  user_id: string
  company_id: string | null
  product_number: string | null
  sku: string | null
  name: { zh: string; en: string }
  description: { zh: string; en: string } | null
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

// PostgreSQL 錯誤類型
interface PostgresError {
  code?: string
  constraint?: string
  message?: string
}

// 檢查是否為商品編號衝突錯誤
function isProductNumberConflict(error: unknown): boolean {
  const pgError = error as PostgresError
  return pgError?.code === '23505' &&
         (pgError?.constraint?.includes('product_number') ||
          pgError?.message?.includes('product_number') ||
          false)
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

  return data || []
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

  return data || null
}

export async function createProduct(
  db: SupabaseClient,
  userId: string,
  data: {
    id?: string
    company_id?: string
    product_number?: string
    sku?: string
    name: { zh: string; en: string }
    description?: { zh: string; en: string }
    base_price: number
    base_currency: string
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
      product_number: data.product_number || null,
      sku: data.sku || null,
      name: data.name,
      description: data.description || null,
      base_price: data.base_price,
      base_currency: data.base_currency,
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

  return product
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

  return product
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

  return data || []
}

/**
 * 生成商品編號（呼叫資料庫 RPC 函數）
 */
export async function generateProductNumber(
  db: SupabaseClient,
  companyId: string
): Promise<string> {
  const { data, error } = await db.rpc('generate_product_number_atomic', {
    p_company_id: companyId
  })

  if (error) {
    throw new Error(`Failed to generate product number: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to generate product number: no data returned')
  }

  return data as string
}

/**
 * 建立商品（帶重試機制，處理編號衝突）
 */
export async function createProductWithRetry(
  db: SupabaseClient,
  userId: string,
  companyId: string,
  data: Omit<Parameters<typeof createProduct>[2], 'product_number' | 'company_id'>,
  options: Pick<RetryOptions, 'maxRetries' | 'baseDelayMs'> = {}
): Promise<Product> {
  return withRetry(
    async () => {
      const productNumber = await generateProductNumber(db, companyId)
      return createProduct(db, userId, {
        ...data,
        company_id: companyId,
        product_number: productNumber
      })
    },
    {
      ...options,
      shouldRetry: isProductNumberConflict
    }
  )
}
