/**
 * 產品資料存取層 (DAL)
 */

import { D1Client } from '@/lib/db/d1-client'

export interface Product {
  id: string
  user_id: string
  company_id: string | null
  sku: string | null
  name: { zh: string; en: string }
  description: { zh: string; en: string } | null
  unit_price: number
  currency: string
  category: string | null
  cost_price: number | null
  cost_currency: string | null
  profit_margin: number | null
  supplier: string | null
  base_price: number
  base_currency: string
  created_at: string
  updated_at: string
}

interface ProductRow {
  id: string
  user_id: string
  company_id: string | null
  sku: string | null
  name: string
  description: string | null
  unit_price: number
  currency: string
  category: string | null
  cost_price: number | null
  cost_currency: string | null
  profit_margin: number | null
  supplier: string | null
  base_price: number
  base_currency: string
  created_at: string
  updated_at: string
}

function parseProductRow(row: ProductRow): Product {
  return {
    ...row,
    name: JSON.parse(row.name),
    description: row.description ? JSON.parse(row.description) : null
  }
}

export async function getProducts(
  db: D1Client,
  userId: string,
  companyId?: string
): Promise<Product[]> {
  let sql = 'SELECT * FROM products WHERE user_id = ?'
  const params: unknown[] = [userId]

  if (companyId) {
    sql += ' AND company_id = ?'
    params.push(companyId)
  }

  sql += ' ORDER BY created_at DESC'

  const rows = await db.query<ProductRow>(sql, params)
  return rows.map(parseProductRow)
}

export async function getProductById(
  db: D1Client,
  userId: string,
  productId: string
): Promise<Product | null> {
  const row = await db.queryOne<ProductRow>(
    'SELECT * FROM products WHERE id = ? AND user_id = ?',
    [productId, userId]
  )

  return row ? parseProductRow(row) : null
}

export async function createProduct(
  db: D1Client,
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
    base_price?: number
  }
): Promise<Product> {
  const id = data.id || crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO products (
      id, user_id, company_id, sku, name, description, unit_price, currency,
      category, cost_price, cost_currency, profit_margin, supplier, base_price,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.company_id || null,
      data.sku || null,
      JSON.stringify(data.name),
      data.description ? JSON.stringify(data.description) : null,
      data.unit_price,
      data.currency,
      data.category || null,
      data.cost_price || null,
      data.cost_currency || null,
      data.profit_margin || null,
      data.supplier || null,
      data.base_price || null,
      now,
      now
    ]
  )

  const product = await getProductById(db, userId, id)
  if (!product) {
    throw new Error('Failed to create product')
  }

  return product
}

export async function updateProduct(
  db: D1Client,
  userId: string,
  productId: string,
  data: Partial<Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Product> {
  const updates: string[] = []
  const params: unknown[] = []

  if (data.name) {
    updates.push('name = ?')
    params.push(JSON.stringify(data.name))
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    params.push(data.description ? JSON.stringify(data.description) : null)
  }
  if (data.unit_price !== undefined) {
    updates.push('unit_price = ?')
    params.push(data.unit_price)
  }
  if (data.currency !== undefined) {
    updates.push('currency = ?')
    params.push(data.currency)
  }
  if (data.sku !== undefined) {
    updates.push('sku = ?')
    params.push(data.sku)
  }
  if (data.category !== undefined) {
    updates.push('category = ?')
    params.push(data.category)
  }
  if (data.cost_price !== undefined) {
    updates.push('cost_price = ?')
    params.push(data.cost_price)
  }
  if (data.cost_currency !== undefined) {
    updates.push('cost_currency = ?')
    params.push(data.cost_currency)
  }
  if (data.profit_margin !== undefined) {
    updates.push('profit_margin = ?')
    params.push(data.profit_margin)
  }
  if (data.supplier !== undefined) {
    updates.push('supplier = ?')
    params.push(data.supplier)
  }
  if (data.base_price !== undefined) {
    updates.push('base_price = ?')
    params.push(data.base_price)
  }
  if (data.company_id !== undefined) {
    updates.push('company_id = ?')
    params.push(data.company_id)
  }

  if (updates.length === 0) {
    const product = await getProductById(db, userId, productId)
    if (!product) {
      throw new Error('Product not found')
    }
    return product
  }

  updates.push('updated_at = ?')
  params.push(new Date().toISOString())

  params.push(productId, userId)

  await db.execute(
    `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  )

  const product = await getProductById(db, userId, productId)
  if (!product) {
    throw new Error('Product not found after update')
  }

  return product
}

export async function deleteProduct(
  db: D1Client,
  userId: string,
  productId: string
): Promise<void> {
  const result = await db.execute(
    'DELETE FROM products WHERE id = ? AND user_id = ?',
    [productId, userId]
  )

  if (result.count === 0) {
    throw new Error('Product not found or already deleted')
  }
}

export async function searchProducts(
  db: D1Client,
  userId: string,
  query: string,
  companyId?: string
): Promise<Product[]> {
  let sql = `
    SELECT * FROM products
    WHERE user_id = ?
    AND (sku LIKE ? OR name LIKE ? OR category LIKE ?)
  `
  const params: unknown[] = [userId, `%${query}%`, `%${query}%`, `%${query}%`]

  if (companyId) {
    sql += ' AND company_id = ?'
    params.push(companyId)
  }

  sql += ' ORDER BY created_at DESC LIMIT 50'

  const rows = await db.query<ProductRow>(sql, params)
  return rows.map(parseProductRow)
}
