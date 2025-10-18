/**
 * Zeabur PostgreSQL 數據庫服務層
 * 提供所有業務表的 CRUD 操作
 *
 * 注意：所有函數都包含 user_id 過濾，確保多租戶隔離
 */

import { getZeaburPool, query } from '@/lib/db/zeabur'
import { QueryResult } from 'pg'

// ========================================
// 類型定義
// ========================================

export interface Customer {
  id: string
  user_id: string
  name: { zh: string; en: string }
  email: string
  phone?: string
  address?: { zh: string; en: string }
  tax_id?: string
  contact_person?: { zh: string; en: string }
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  user_id: string
  sku?: string
  name: { zh: string; en: string }
  description?: { zh: string; en: string }
  unit_price: number
  currency: string
  category?: string
  created_at: string
  updated_at: string
}

export interface Quotation {
  id: string
  user_id: string
  customer_id: string
  quotation_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id?: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  created_at: string
  updated_at: string
}

// ========================================
// Customers CRUD
// ========================================

export async function getCustomers(userId: string): Promise<Customer[]> {
  const result = await query(
    'SELECT * FROM customers WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

export async function getCustomerById(id: string, userId: string): Promise<Customer | null> {
  const result = await query(
    'SELECT * FROM customers WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return result.rows[0] || null
}

export async function createCustomer(data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
  const result = await query(
    `INSERT INTO customers (user_id, name, email, phone, address, tax_id, contact_person)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.user_id, data.name, data.email, data.phone, data.address, data.tax_id, data.contact_person]
  )
  return result.rows[0]
}

export async function updateCustomer(
  id: string,
  userId: string,
  data: Partial<Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Customer | null> {
  const pool = getZeaburPool()

  const fields: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (data.name !== undefined) {
    fields.push(`name = $${paramCount++}`)
    values.push(data.name)
  }
  if (data.email !== undefined) {
    fields.push(`email = $${paramCount++}`)
    values.push(data.email)
  }
  if (data.phone !== undefined) {
    fields.push(`phone = $${paramCount++}`)
    values.push(data.phone)
  }
  if (data.address !== undefined) {
    fields.push(`address = $${paramCount++}`)
    values.push(data.address)
  }
  if (data.tax_id !== undefined) {
    fields.push(`tax_id = $${paramCount++}`)
    values.push(data.tax_id)
  }
  if (data.contact_person !== undefined) {
    fields.push(`contact_person = $${paramCount++}`)
    values.push(data.contact_person)
  }

  if (fields.length === 0) {
    return getCustomerById(id, userId)
  }

  values.push(id, userId)
  const result = await query(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`,
    values
  )

  return result.rows[0] || null
}

export async function deleteCustomer(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM customers WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return (result.rowCount ?? 0) > 0
}

// ========================================
// Products CRUD
// ========================================

export async function getProducts(userId: string): Promise<Product[]> {
  const result = await query(
    'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

export async function getProductById(id: string, userId: string): Promise<Product | null> {
  const result = await query(
    'SELECT * FROM products WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return result.rows[0] || null
}

export async function createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
  const result = await query(
    `INSERT INTO products (user_id, sku, name, description, unit_price, currency, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.user_id, data.sku, data.name, data.description, data.unit_price, data.currency, data.category]
  )
  return result.rows[0]
}

export async function updateProduct(
  id: string,
  userId: string,
  data: Partial<Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Product | null> {
  const pool = getZeaburPool()

  const fields: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (data.sku !== undefined) {
    fields.push(`sku = $${paramCount++}`)
    values.push(data.sku)
  }
  if (data.name !== undefined) {
    fields.push(`name = $${paramCount++}`)
    values.push(data.name)
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramCount++}`)
    values.push(data.description)
  }
  if (data.unit_price !== undefined) {
    fields.push(`unit_price = $${paramCount++}`)
    values.push(data.unit_price)
  }
  if (data.currency !== undefined) {
    fields.push(`currency = $${paramCount++}`)
    values.push(data.currency)
  }
  if (data.category !== undefined) {
    fields.push(`category = $${paramCount++}`)
    values.push(data.category)
  }

  if (fields.length === 0) {
    return getProductById(id, userId)
  }

  values.push(id, userId)
  const result = await query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`,
    values
  )

  return result.rows[0] || null
}

export async function deleteProduct(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM products WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return (result.rowCount ?? 0) > 0
}

// ========================================
// Quotations CRUD
// ========================================

export async function getQuotations(userId: string): Promise<Quotation[]> {
  const result = await query(
    'SELECT * FROM quotations WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

export async function getQuotationById(id: string, userId: string): Promise<Quotation | null> {
  const result = await query(
    'SELECT * FROM quotations WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return result.rows[0] || null
}

export async function createQuotation(data: Omit<Quotation, 'id' | 'created_at' | 'updated_at'>): Promise<Quotation> {
  const result = await query(
    `INSERT INTO quotations (
      user_id, customer_id, quotation_number, status, issue_date, valid_until,
      currency, subtotal, tax_rate, tax_amount, total_amount, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      data.user_id, data.customer_id, data.quotation_number, data.status,
      data.issue_date, data.valid_until, data.currency, data.subtotal,
      data.tax_rate, data.tax_amount, data.total_amount, data.notes
    ]
  )
  return result.rows[0]
}

export async function updateQuotation(
  id: string,
  userId: string,
  data: Partial<Omit<Quotation, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Quotation | null> {
  const pool = getZeaburPool()

  const fields: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (data.customer_id !== undefined) {
    fields.push(`customer_id = $${paramCount++}`)
    values.push(data.customer_id)
  }
  if (data.status !== undefined) {
    fields.push(`status = $${paramCount++}`)
    values.push(data.status)
  }
  if (data.issue_date !== undefined) {
    fields.push(`issue_date = $${paramCount++}`)
    values.push(data.issue_date)
  }
  if (data.valid_until !== undefined) {
    fields.push(`valid_until = $${paramCount++}`)
    values.push(data.valid_until)
  }
  if (data.currency !== undefined) {
    fields.push(`currency = $${paramCount++}`)
    values.push(data.currency)
  }
  if (data.subtotal !== undefined) {
    fields.push(`subtotal = $${paramCount++}`)
    values.push(data.subtotal)
  }
  if (data.tax_rate !== undefined) {
    fields.push(`tax_rate = $${paramCount++}`)
    values.push(data.tax_rate)
  }
  if (data.tax_amount !== undefined) {
    fields.push(`tax_amount = $${paramCount++}`)
    values.push(data.tax_amount)
  }
  if (data.total_amount !== undefined) {
    fields.push(`total_amount = $${paramCount++}`)
    values.push(data.total_amount)
  }
  if (data.notes !== undefined) {
    fields.push(`notes = $${paramCount++}`)
    values.push(data.notes)
  }

  if (fields.length === 0) {
    return getQuotationById(id, userId)
  }

  values.push(id, userId)
  const result = await query(
    `UPDATE quotations SET ${fields.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`,
    values
  )

  return result.rows[0] || null
}

export async function deleteQuotation(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM quotations WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return (result.rowCount ?? 0) > 0
}

// ========================================
// Quotation Items CRUD
// ========================================

export async function getQuotationItems(quotationId: string, userId: string): Promise<QuotationItem[]> {
  const pool = getZeaburPool()

  // 首先驗證報價單屬於該用戶
  const quotation = await getQuotationById(quotationId, userId)
  if (!quotation) {
    throw new Error('Quotation not found or access denied')
  }

  const result = await query(
    'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY created_at ASC',
    [quotationId]
  )
  return result.rows
}

export async function createQuotationItem(
  quotationId: string,
  userId: string,
  data: Omit<QuotationItem, 'id' | 'quotation_id' | 'created_at' | 'updated_at'>
): Promise<QuotationItem> {
  const pool = getZeaburPool()

  // 驗證報價單屬於該用戶
  const quotation = await getQuotationById(quotationId, userId)
  if (!quotation) {
    throw new Error('Quotation not found or access denied')
  }

  const result = await query(
    `INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount, subtotal)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [quotationId, data.product_id, data.quantity, data.unit_price, data.discount, data.subtotal]
  )
  return result.rows[0]
}

export async function deleteQuotationItem(id: string, quotationId: string, userId: string): Promise<boolean> {
  const pool = getZeaburPool()

  // 驗證報價單屬於該用戶
  const quotation = await getQuotationById(quotationId, userId)
  if (!quotation) {
    throw new Error('Quotation not found or access denied')
  }

  const result = await query(
    'DELETE FROM quotation_items WHERE id = $1 AND quotation_id = $2',
    [id, quotationId]
  )
  return (result.rowCount ?? 0) > 0
}

// ========================================
// 輔助函數
// ========================================

/**
 * 生成下一個報價單號碼
 */
export async function generateQuotationNumber(userId: string): Promise<string> {
  const pool = getZeaburPool()
  const year = new Date().getFullYear()
  const prefix = `Q${year}-`

  const result = await query(
    `SELECT quotation_number FROM quotations
     WHERE user_id = $1 AND quotation_number LIKE $2
     ORDER BY quotation_number DESC
     LIMIT 1`,
    [userId, `${prefix}%`]
  )

  if (result.rows.length === 0) {
    return `${prefix}001`
  }

  const lastNumber = result.rows[0].quotation_number
  const num = parseInt(lastNumber.split('-')[1]) + 1
  return `${prefix}${num.toString().padStart(3, '0')}`
}

/**
 * 驗證客戶是否屬於該用戶
 */
export async function validateCustomerOwnership(customerId: string, userId: string): Promise<boolean> {
  const customer = await getCustomerById(customerId, userId)
  return customer !== null
}

/**
 * 驗證產品是否屬於該用戶
 */
export async function validateProductOwnership(productId: string, userId: string): Promise<boolean> {
  const product = await getProductById(productId, userId)
  return product !== null
}
